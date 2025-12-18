import React, { useMemo, useState } from 'react'

const LiveMVP = ({ teams }) => {
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Flatten and sort players
    const mvpList = useMemo(() => {
        const allPlayers = []
        teams.forEach(team => {
            if (team.members && Array.isArray(team.members)) {
                team.members.forEach(member => {
                    allPlayers.push({
                        ...member,
                        teamName: team.team_name,
                        teamId: team.id
                    })
                })
            }
        })

        // Sort by Kills (desc), then Matches (asc) for efficiency, then Name
        return allPlayers.sort((a, b) => {
            if (b.kills !== a.kills) return b.kills - a.kills
            if (a.matches !== b.matches) return a.matches - b.matches
            return 0
        }).slice(0, 100) // Top 100 MVPs (limit for performance)
    }, [teams])

    // Pagination Logic
    const totalPages = Math.ceil(mvpList.length / itemsPerPage) || 1
    const displayedPlayers = mvpList.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage)

    if (mvpList.length === 0) {
        return (
            <div className="empty-state">
                <p>No player stats available yet.</p>
            </div>
        )
    }

    return (
        <>
            <div className="table-container fade-in">
                <table className="points-table mvp-table">
                    <thead>
                        <tr>
                            <th className="th-rank">#</th>
                            <th className="th-player">PLAYER</th>
                            <th className="th-team">TEAM</th>
                            <th className="th-matches">MATCHES</th>
                            <th className="th-kills text-right">KILLS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedPlayers.map((player, index) => {
                            const globalIndex = (currentPage - 1) * itemsPerPage + index
                            return (
                                <tr key={`${player.teamId}-${player.name}-${globalIndex}`} className="team-row">
                                    <td className="td-rank">
                                        <div className={`rank-badge ${
                                            globalIndex === 0 ? 'rank-1' : 
                                            globalIndex === 1 ? 'rank-2' : 
                                            globalIndex === 2 ? 'rank-3' : ''
                                        }`}>
                                            {globalIndex + 1}
                                        </div>
                                    </td>
                                    <td className="td-player">
                                        <span className="player-name">{player.name}</span>
                                    </td>
                                    <td className="td-team">
                                        <span className="team-name sm">{player.teamName}</span>
                                    </td>
                                    <td className="td-matches">{player.matches}</td>
                                    <td className="td-kills text-right">
                                        <span className="kill-count">{player.kills}</span>
                                    </td>
                                </tr>
                            )
                        })}
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
                <div className="pagination-info" style={{
                    fontSize: '0.8rem',
                    opacity: 0.6,
                    fontWeight: 500,
                    margin: '0 8px'
                }}>
                    Page {currentPage} of {totalPages}
                </div>
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

export default LiveMVP
