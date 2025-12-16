import React from 'react'

const LivePlayerStats = ({ members }) => {
    return (
        <tr className="stats-row">
            <td colSpan="6" className="stats-cell">
                <div className="player-stats-container">
                    <table className="player-table">
                        <thead>
                            <tr>
                                <th>PLAYER</th>
                                <th>MATCHES</th>
                                <th>AVG KILLS</th>
                                <th>TOTAL KILLS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members && members.map((member, mIndex) => (
                                <tr key={mIndex}>
                                    <td>{member.name || member}</td>
                                    <td>{member.matches || 0}</td>
                                    <td>{(member.avg_kills || 0).toFixed(1)}</td>
                                    <td><strong>{member.kills || 0}</strong></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
    )
}

export default LivePlayerStats
