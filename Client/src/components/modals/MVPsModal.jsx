import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { X, Trophy, Award, Target, Zap } from 'lucide-react'
import './MVPsModal.css'

const MVPsModal = ({ isOpen, onClose, tournament }) => {
    const [mvps, setMvps] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (isOpen && tournament) {
            fetchMVPs()
        }
    }, [isOpen, tournament])

    const fetchMVPs = async () => {
        try {
            setLoading(true)
            setError(null)

            // Fetch all teams for this tournament
            const { data: teams, error: teamsError } = await supabase
                .from('tournament_teams')
                .select('*')
                .eq('tournament_id', tournament.id)

            if (teamsError) throw teamsError

            // Aggregate all players from all teams
            const allPlayers = []
            
            teams.forEach(team => {
                if (team.members && Array.isArray(team.members)) {
                    team.members.forEach(member => {
                        const playerName = member.name || member
                        if (playerName) {
                            // Check if player already exists (same name from different teams)
                            const existingPlayer = allPlayers.find(p => 
                                p.name.toLowerCase().trim() === playerName.toLowerCase().trim()
                            )

                            if (existingPlayer) {
                                // Aggregate stats for duplicate names
                                existingPlayer.matches_played += (member.matches_played || 0)
                                existingPlayer.kills += (member.kills || 0)
                                existingPlayer.wwcd += (member.wwcd || 0)
                                existingPlayer.teams.push(team.team_name)
                            } else {
                                // Add new player
                                allPlayers.push({
                                    name: playerName,
                                    matches_played: member.matches_played || 0,
                                    kills: member.kills || 0,
                                    wwcd: member.wwcd || 0,
                                    teams: [team.team_name]
                                })
                            }
                        }
                    })
                }
            })

            // Sort by kills (descending), then by WWCD, then by matches played
            const sortedMVPs = allPlayers.sort((a, b) => {
                if (b.kills !== a.kills) return b.kills - a.kills
                if (b.wwcd !== a.wwcd) return b.wwcd - a.wwcd
                return b.matches_played - a.matches_played
            })

            // Calculate average kills per match
            const mvpsWithAvg = sortedMVPs.map(player => ({
                ...player,
                avgKills: player.matches_played > 0 
                    ? (player.kills / player.matches_played).toFixed(2) 
                    : '0.00'
            }))

            setMvps(mvpsWithAvg)
        } catch (err) {
            console.error('Error fetching MVPs:', err)
            setError('Failed to load MVPs')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen || !tournament) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content mvps-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-title">
                        <Trophy className="trophy-icon" size={24} />
                        <h2>Tournament MVPs</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <p className="modal-description">
                        Top performers from <strong>{tournament.name}</strong>
                    </p>

                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading MVPs...</p>
                        </div>
                    ) : error ? (
                        <div className="error-state">
                            <p>{error}</p>
                        </div>
                    ) : mvps.length === 0 ? (
                        <div className="empty-state">
                            <Award size={48} className="empty-icon" />
                            <h3>No Player Data</h3>
                            <p>No player statistics available yet. Add teams and calculate results to see MVPs.</p>
                        </div>
                    ) : (
                        <div className="mvps-table-container">
                            <table className="mvps-table">
                                <thead>
                                    <tr>
                                        <th className="rank-col">#</th>
                                        <th className="player-col">Player</th>
                                        <th className="team-col">Team(s)</th>
                                        <th className="matches-col">M</th>
                                        <th className="kills-col">Kills</th>
                                        <th className="avg-col">Avg</th>
                                        <th className="wwcd-col">WWCD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mvps.map((player, index) => (
                                        <tr 
                                            key={index} 
                                            className={index < 3 ? `top-${index + 1}` : ''}
                                        >
                                            <td className="rank-col">
                                                <span className="rank-number">
                                                    {index === 0 && <Trophy size={16} className="gold-icon" />}
                                                    {index === 1 && <Award size={16} className="silver-icon" />}
                                                    {index === 2 && <Award size={16} className="bronze-icon" />}
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td className="player-col">
                                                <strong>{player.name}</strong>
                                            </td>
                                            <td className="team-col">
                                                <span className="team-badges">
                                                    {player.teams.map((team, idx) => (
                                                        <span key={idx} className="team-badge">
                                                            {team}
                                                        </span>
                                                    ))}
                                                </span>
                                            </td>
                                            <td className="matches-col">{player.matches_played}</td>
                                            <td className="kills-col">
                                                <strong>{player.kills}</strong>
                                            </td>
                                            <td className="avg-col">{player.avgKills}</td>
                                            <td className="wwcd-col">
                                                {player.wwcd > 0 && (
                                                    <span className="wwcd-badge">
                                                        <Target size={14} />
                                                        {player.wwcd}
                                                    </span>
                                                )}
                                                {player.wwcd === 0 && '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="cancel-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    )
}

export default MVPsModal

