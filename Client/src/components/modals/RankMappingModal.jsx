import React, { useState } from 'react'
import { X, Check } from 'lucide-react'
import './RankMappingModal.css'
import { useToast } from '../../context/ToastContext'

const RankMappingModal = ({ isOpen, extractedData, teams, onSave, onCancel }) => {
    const [mappings, setMappings] = useState({})
    const [saving, setSaving] = useState(false)
    const { addToast } = useToast()

    const handleSelectTeam = (rank, teamId) => {
        setMappings(prev => ({
            ...prev,
            [rank]: teamId
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
        await onSave(mappings, extractedData)
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
                                            <div className="rank-stats">
                                                {rankData.total_eliminations !== undefined ? rankData.total_eliminations : rankData.eliminations} eliminations
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
