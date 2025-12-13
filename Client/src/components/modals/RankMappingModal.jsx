import React, { useState, useEffect } from 'react'
import { X, Check, Edit2 } from 'lucide-react'
import { nameSimilarity } from '../../lib/aiResultExtraction'
import './RankMappingModal.css'
import { useToast } from '../../context/ToastContext'

const RankMappingModal = ({ isOpen, extractedData, teams, onSave, onCancel }) => {
    const [mappings, setMappings] = useState({})
    const [editableKills, setEditableKills] = useState({})
    const [editingRank, setEditingRank] = useState(null)
    const [saving, setSaving] = useState(false)
    const { addToast } = useToast()

    // Initialize editable kills when data changes
    useEffect(() => {
        if (isOpen && extractedData) {
            const initialKills = {}
            extractedData.forEach(rankData => {
                initialKills[rankData.rank] = rankData.total_eliminations !== undefined 
                    ? rankData.total_eliminations 
                    : (rankData.eliminations || 0)
            })
            setEditableKills(initialKills)
        }
    }, [isOpen, extractedData])

    // Auto-match teams when modal opens
    useEffect(() => {
        if (isOpen && extractedData && teams) {
            const candidateMatches = {} // Map<TeamID, { rank: number, score: number }>
            let matchedCount = 0

            extractedData.forEach(rankData => {
                let bestTeam = null
                let bestScore = 0

                teams.forEach(team => {
                    // STRICT RULE: Only match based on players
                    if (!team.members || team.members.length === 0) return

                    let matchedPlayersCount = 0
                    let totalSim = 0

                    rankData.players.forEach(extractedPlayerRaw => {
                        const extractedPlayerName = typeof extractedPlayerRaw === 'object' ? extractedPlayerRaw.name : extractedPlayerRaw
                        
                        let bestPlayerSim = 0
                        team.members.forEach(member => {
                            const sim = nameSimilarity(extractedPlayerName, member)
                            if (sim > bestPlayerSim) bestPlayerSim = sim
                        })

                        if (bestPlayerSim >= 0.8) {
                            matchedPlayersCount++
                            totalSim += bestPlayerSim
                        }
                    })

                    // RULE: Must match at least 2 players
                    if (matchedPlayersCount >= 2) {
                        const avgSim = totalSim / matchedPlayersCount
                        // Score calculation:
                        // Primary weight: Number of matched players (x10)
                        // Secondary weight: Average similarity (0-1)
                        const score = (matchedPlayersCount * 10) + avgSim
                        
                        if (score > bestScore) {
                            bestScore = score
                            bestTeam = team
                        }
                    }
                })

                if (bestTeam) {
                    // Conflict Resolution:
                    // If multiple extracted ranks match the same DB team (unlikely but possible),
                    // assign the team to the rank with the higher match score.
                    const existingClaim = candidateMatches[bestTeam.id]
                    
                    if (!existingClaim || bestScore > existingClaim.score) {
                        // If there was an existing claim, we are overwriting it (stealing the team)
                        // The previous rank will remain unmapped, which is correct behavior for a conflict
                        candidateMatches[bestTeam.id] = { 
                            rank: rankData.rank, 
                            score: bestScore 
                        }
                    }
                }
            })

            // Convert candidate matches to mapping state
            const newMappings = {}
            Object.entries(candidateMatches).forEach(([teamId, data]) => {
                newMappings[data.rank] = teamId
                matchedCount++
            })

            if (Object.keys(newMappings).length > 0) {
                setMappings(prev => ({ ...prev, ...newMappings }))
                console.log(`🤖 Auto-matched ${matchedCount} teams based on strict player analysis (>=2 players, >=80% sim)`)
            }
        }
    }, [isOpen, extractedData, teams])


    const handleSelectTeam = (rank, teamId) => {
        setMappings(prev => ({
            ...prev,
            [rank]: teamId
        }))
    }

    const handleKillsChange = (rank, value) => {
        const kills = parseInt(value, 10)
        setEditableKills(prev => ({
            ...prev,
            [rank]: isNaN(kills) ? 0 : kills
        }))
    }

    const handleSave = async () => {
        // Validate all ranks are mapped
        const unmappedRanks = extractedData.filter(
            rankData => !mappings[rankData.rank]
        )

        if (unmappedRanks.length > 0) {
            try {
                addToast('warning', `Please map all ranks. ${unmappedRanks.length} rank(s) remaining.`)
            } catch (e) {
                console.error('Toast failed:', e)
            }
            return
        }

        setSaving(true)
        
        // Create an updated version of extractedData with the edited kills
        const updatedExtractedData = extractedData.map(rankData => ({
            ...rankData,
            total_eliminations: editableKills[rankData.rank] || 0,
            eliminations: editableKills[rankData.rank] || 0
        }))

        await onSave(mappings, updatedExtractedData)
        setSaving(false)
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-container rank-mapping-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">Map Teams to Ranks</h2>
                        <p className="modal-subtitle">One-time setup - assign each rank to a team</p>
                    </div>
                    <button className="close-button" onClick={onCancel}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="modal-content rank-mapping-content">
                    <div className="mapping-info">
                        <p>
                            <strong>{extractedData.length} ranks detected</strong> from screenshot.
                            Assign each rank to the corresponding team.
                        </p>
                        <p className="info-note">
                            Player names will be saved to team rosters for automatic detection in future matches.
                        </p>
                    </div>

                    <div className="mappings-list">
                        {extractedData.map((rankData) => {
                            const selectedTeamId = mappings[rankData.rank]
                            const selectedTeam = teams.find(t => t.id === selectedTeamId)

                            return (
                                <div key={rankData.rank} className="mapping-row">
                                    <div className="rank-info">
                                        <div className="rank-badge">#{rankData.rank}</div>
                                        <div className="rank-details">
                                            <div className="players-list">
                                                {rankData.players.slice(0, 4).map((player, idx) => (
                                                    <span key={idx} className="player-name">
                                                        {typeof player === 'object' ? player.name : player}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="rank-stats editable">
                                                {editingRank === rankData.rank ? (
                                                    <input
                                                        type="number"
                                                        value={editableKills[rankData.rank] || 0}
                                                        onChange={(e) => handleKillsChange(rankData.rank, e.target.value)}
                                                        onBlur={() => setEditingRank(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingRank(null)}
                                                        className="kills-input"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span>{editableKills[rankData.rank]} eliminations</span>
                                                )}
                                                <button
                                                    className="edit-kills-btn"
                                                    onClick={() => setEditingRank(rankData.rank)}
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="team-selector">
                                        <select
                                            value={selectedTeamId || ''}
                                            onChange={(e) => handleSelectTeam(rankData.rank, e.target.value)}
                                            className={`team-select ${selectedTeamId ? 'selected' : ''}`}
                                        >
                                            <option value="">Select Team...</option>
                                            {teams.map(team => {
                                                const isSelectedElsewhere = Object.entries(mappings).some(
                                                    ([rank, teamId]) => teamId === team.id && parseInt(rank) !== rankData.rank
                                                )
                                                return (
                                                    <option
                                                        key={team.id}
                                                        value={team.id}
                                                        disabled={isSelectedElsewhere}
                                                    >
                                                        {team.team_name} {isSelectedElsewhere ? '(Assigned)' : ''}
                                                    </option>
                                                )
                                            })}
                                        </select>
                                        {selectedTeamId && (
                                            <Check size={20} className="check-icon" />
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <div className="mapping-progress">
                        <span>
                            {Object.keys(mappings).length} / {extractedData.length} mapped
                        </span>
                    </div>
                    <div className="footer-actions">
                        <button
                            className="action-button secondary"
                            onClick={onCancel}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            className="action-button primary"
                            onClick={handleSave}
                            disabled={saving || Object.keys(mappings).length !== extractedData.length}
                        >
                            {saving ? 'Saving...' : 'Save Mapping & Continue'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RankMappingModal
