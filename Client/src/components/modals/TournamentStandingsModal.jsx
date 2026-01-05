import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { subscribeToTournamentTeams } from '../../lib/realtime'
import { X, Trophy } from 'lucide-react'
import './TournamentStandingsModal.css'

const TournamentStandingsModal = ({ isOpen, onClose, tournament }) => {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedTeam, setExpandedTeam] = useState(null)

  useEffect(() => {
    if (!isOpen || !tournament) {
      setTeams([])
      setError(null)
      setLoading(false)
      return
    }

    let unsubscribe = null

    const fetchTeams = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data: teamsData, error: teamsError } = await supabase
          .from('lobby_teams')
          .select('*')
          .eq('lobby_id', tournament.id)

        if (teamsError) throw teamsError

        // Calculate total points for sorting (same logic as LiveTournament)
        const processedTeams = (teamsData || []).map(team => {
          const points = typeof team.total_points === 'object'
            ? team.total_points
            : { kill_points: 0, placement_points: 0, matches_played: 0, wins: 0 }

          const total = (points.kill_points || 0) + (points.placement_points || 0)
          return { ...team, points, total }
        }).sort((a, b) => b.total - a.total)

        setTeams(processedTeams)
      } catch (err) {
        console.error('Error fetching teams:', err)
        setError(err.message || 'Failed to load teams')
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()

    // Subscribe to realtime changes
    unsubscribe = subscribeToTournamentTeams(tournament.id, () => {
      fetchTeams()
    })

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [isOpen, tournament])

  if (!isOpen || !tournament) return null

  return (
    <div className="standings-modal-overlay" onClick={onClose}>
      <div className="standings-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="standings-modal-header">
          <div className="standings-header-inner">
            <div className="standings-header-left">
              <Trophy className="standings-trophy-icon" size={32} />
              <h1>{tournament?.name}</h1>
            </div>
            <button className="standings-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="standings-modal-content">
          {loading ? (
            <div className="standings-loading-state">
              <div className="standings-spinner"></div>
              <p>Loading standings...</p>
            </div>
          ) : error ? (
            <div className="standings-error-state">
              <p>Error: {error}</p>
              <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Retry
              </button>
            </div>
          ) : teams.length === 0 ? (
            <div className="standings-empty-state">
              <p>No teams added to this tournament</p>
            </div>
          ) : (
            <article className="standings-card-white">
              <table className="standings-table-white" role="table" aria-label="Tournament leaderboard">
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
                  {teams && teams.length > 0 ? (
                    teams.map((team, index) => (
                      <React.Fragment key={team.id || index}>
                        <tr className={index < 3 ? `top-${index + 1}` : ''}>
                          <td className="rank-col" data-label="#">
                            <span className="rank-number">{index + 1}</span>
                          </td>
                          <td
                            className="team-col clickable"
                            data-label="Team"
                            onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            {team.team_name || 'Unknown Team'}
                            {team.members && team.members.length > 0 && (
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                                {expandedTeam === team.id ? '▼' : '▶'}
                              </span>
                            )}
                          </td>
                          <td className="matches-col" data-label="M">{team.points?.matches_played || 0}</td>
                          <td className="wins-col" data-label="WWCD">{team.points?.wins || 0}</td>
                          <td className="place-col" data-label="Place">{team.points?.placement_points || 0}</td>
                          <td className="kills-col" data-label="Kills">{team.points?.kill_points || 0}</td>
                          <td className="points-col" data-label="Total">{team.total || 0}</td>
                        </tr>
                        {expandedTeam === team.id && team.members && Array.isArray(team.members) && team.members.length > 0 && (
                          <tr className="members-row">
                            <td colSpan="7" className="members-cell">
                              <div className="members-container">
                                <strong>Team Members Stats:</strong>
                                <table className="player-stats-table">
                                  <thead>
                                    <tr>
                                      <th>Player Name</th>
                                      <th>M</th>
                                      <th>Kills</th>
                                      <th>WWCD</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {team.members.map((member, idx) => (
                                      <tr key={idx}>
                                        <td className="player-name">{typeof member === 'object' ? (member.name || 'Unknown') : (member || 'Unknown')}</td>
                                        <td>{typeof member === 'object' ? (member.matches_played || 0) : 0}</td>
                                        <td>{typeof member === 'object' ? (member.kills || 0) : 0}</td>
                                        <td>{typeof member === 'object' ? (member.wwcd || 0) : 0}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        No teams found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </article>
          )}
        </main>
      </div>
    </div>
  )
}

export default TournamentStandingsModal

