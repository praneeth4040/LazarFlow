import React, { useState } from 'react'
import LivePlayerStats from './LivePlayerStats'

const LiveTable = ({ teams }) => {
    const [expandedTeamId, setExpandedTeamId] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 12

    const toggleTeam = (teamId) => {
        setExpandedTeamId(expandedTeamId === teamId ? null : teamId)
    }

    const totalPages = Math.ceil(teams.length / itemsPerPage) || 1

    return (
        <>
            <div className="table-container">
                <table className="points-table">
                    <thead>
                        <tr>
                            <th className="th-rank">#</th>
                            <th className="th-team">TEAM NAME</th>
                            <th className="th-wwcd">WWCD</th>
                            <th className="th-place">PLACE PTS</th>
                            <th className="th-kills">KILLS</th>
                            <th className="th-total">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((team, index) => (
                            <React.Fragment key={team.id || index}>
                                <tr
                                    className={`team-row ${expandedTeamId === (team.id || index) ? 'expanded' : ''}`}
                                    onClick={() => toggleTeam(team.id || index)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td className="td-rank">
                                        <div className="rank-badge">{(currentPage - 1) * itemsPerPage + index + 1}</div>
                                    </td>
                                    <td className="td-team">
                                        <span className="team-name">{team.team_name}</span>
                                    </td>
                                    <td className="td-wwcd">
                                        {team.points.wins > 0 ? (
                                            <span className="wwcd-count">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px', verticalAlign: 'text-bottom' }}>
                                                    <path d="M20.2 13.5l-1.3-6.6c-.3-1.6-1.7-2.8-3.3-2.8H14c-1.1 0-2.1.5-2.8 1.4-.7-.9-1.7-1.4-2.8-1.4H6.8c-1.6 0-3 1.2-3.3 2.8L2.2 13.5c-.3 1.5.7 2.9 2.2 3.1l6.8 1.1c.4.1.9-.1 1.1-.5l1.6-4.5c.2-.6 1.1-.6 1.3 0l1.6 4.5c.2.4.7.7 1.1.5l6.8-1.1c1.5-.2 2.5-1.6 2.2-3.1z" />
                                                </svg>
                                                {team.points.wins}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="td-place">{team.points.placement_points}</td>
                                    <td className="td-kills">{team.points.kill_points}</td>
                                    <td className="td-total">{team.total}</td>
                                </tr>

                                {/* Expanded Player Stats Row */}
                                {expandedTeamId === (team.id || index) && (
                                    <LivePlayerStats members={team.members} />
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="pagination-controls" aria-label="pagination">
                <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                    title="Previous"
                >
                    ‹
                </button>
                <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                    title="Next"
                >
                    ›
                </button>
            </div>
        </>
    )
}

export default LiveTable
