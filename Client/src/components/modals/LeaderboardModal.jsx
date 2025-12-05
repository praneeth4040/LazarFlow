import React from 'react'
import { X, Trophy } from 'lucide-react'
import './LeaderboardModal.css'

const LeaderboardModal = ({ isOpen, onClose, tournament }) => {
    if (!isOpen || !tournament) return null

    // Get final standings from tournament
    const finalStandings = tournament.final_standings || []

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content leaderboard-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-title">
                        <Trophy className="trophy-icon" size={24} />
                        <h2>Final Leaderboard - {tournament.name}</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {finalStandings.length === 0 ? (
                        <div className="empty-state">
                            <Trophy size={48} className="empty-icon" />
                            <h3>No Final Standings</h3>
                            <p>This tournament was ended before any standings were recorded.</p>
                        </div>
                    ) : (
                        <div className="leaderboard-table-container">
                            <table className="leaderboard-table">
                                <thead>
                                    <tr>
                                        <th className="rank-col">#</th>
                                        <th className="team-col">Team</th>
                                        <th className="matches-col">M</th>
                                        <th className="wins-col">WWCD</th>
                                        <th className="place-col">Place Pts</th>
                                        <th className="kills-col">Kills</th>
                                        <th className="points-col">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {finalStandings.map((team, index) => (
                                        <tr key={index} className={index < 3 ? `top-${index + 1}` : ''}>
                                            <td className="rank-col">
                                                <span className="rank-number">{team.rank}</span>
                                            </td>
                                            <td className="team-col">
                                                <strong>{team.team_name}</strong>
                                            </td>
                                            <td className="matches-col">{team.matches_played || 0}</td>
                                            <td className="wins-col">{team.wins || 0}</td>
                                            <td className="place-col">{team.placement_points || 0}</td>
                                            <td className="kills-col">{team.kill_points || 0}</td>
                                            <td className="points-col">
                                                <strong>{team.total_points || 0}</strong>
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

export default LeaderboardModal

