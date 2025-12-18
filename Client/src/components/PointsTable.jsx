import React from 'react'
import { calculateStandings } from '../utils/templateHandler'
import './PointsTable.css'

const PointsTable = ({ teams, className = '' }) => {
  // Calculate and sort standings
  const standings = calculateStandings(teams)

  if (!teams || teams.length === 0) {
    return (
      <div className="points-table-empty">
        <p>No teams added yet. Add teams to see standings.</p>
      </div>
    )
  }

  return (
    <div className={`points-table-wrapper ${className}`}>
      <table className="standings-table">
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
          {standings.map((team, index) => (
            <tr key={index} className={index < 3 ? `top-${index + 1}` : ''}>
              <td className="rank-col">
                <span className="rank-number">{team.rank}</span>
              </td>
              <td className="team-col">{team.name}</td>
              <td className="matches-col">{team.matchesPlayed || 0}</td>
              <td className="wins-col">{team.wins || 0}</td>
              <td className="place-col">{team.placementPoints || 0}</td>
              <td className="kills-col">{team.killPoints || 0}</td>
              <td className="points-col">{team.totalPoints || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PointsTable
