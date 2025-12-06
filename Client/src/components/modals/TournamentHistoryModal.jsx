import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { X, Trophy, Award, Target, ExternalLink, Calendar, Gamepad2, Award as AwardIcon } from 'lucide-react'
import './TournamentHistoryModal.css'

const TournamentHistoryModal = ({ isOpen, onClose, tournament }) => {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [mvps, setMvps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedTeam, setExpandedTeam] = useState(null)

  useEffect(() => {
    if (isOpen && tournament) {
      fetchTournamentData()
    }
  }, [isOpen, tournament])

  const fetchTournamentData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', tournament.id)

      if (teamsError) throw teamsError

      // Process teams for standings
      const processedTeams = (teamsData || []).map(team => {
        const points = typeof team.total_points === 'object'
          ? team.total_points
          : { kill_points: 0, placement_points: 0, matches_played: 0, wins: 0 }

        const total = (points.kill_points || 0) + (points.placement_points || 0)
        return { ...team, points, total }
      }).sort((a, b) => b.total - a.total)

      setTeams(processedTeams)

      // Calculate MVPs
      const allPlayers = []
      
      teamsData.forEach(team => {
        if (team.members && Array.isArray(team.members)) {
          team.members.forEach(member => {
            const playerName = member.name || member
            if (playerName) {
              const existingPlayer = allPlayers.find(p => 
                p.name.toLowerCase().trim() === playerName.toLowerCase().trim()
              )

              if (existingPlayer) {
                existingPlayer.matches_played += (member.matches_played || 0)
                existingPlayer.kills += (member.kills || 0)
                existingPlayer.wwcd += (member.wwcd || 0)
                existingPlayer.teams.push(team.team_name)
              } else {
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

      const sortedMVPs = allPlayers.sort((a, b) => {
        if (b.kills !== a.kills) return b.kills - a.kills
        if (b.wwcd !== a.wwcd) return b.wwcd - a.wwcd
        return b.matches_played - a.matches_played
      })

      const mvpsWithAvg = sortedMVPs.map(player => ({
        ...player,
        avgKills: player.matches_played > 0 
          ? (player.kills / player.matches_played).toFixed(2) 
          : '0.00'
      }))

      setMvps(mvpsWithAvg)
    } catch (err) {
      console.error('Error fetching tournament data:', err)
      setError('Failed to load tournament data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getGameName = (game) => {
    const games = {
      freeFire: 'Free Fire',
      bgmi: 'BGMI',
      other: 'Other'
    }
    return games[game] || 'Other'
  }

  const handleFullView = () => {
    if (tournament?.id) {
      window.open(`/live/${tournament.id}`, '_blank')
    }
  }

  const handleMVPFullView = () => {
    if (tournament?.id) {
      window.open(`/live/${tournament.id}?view=mvps`, '_blank')
    }
  }

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (!isOpen || !tournament) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container tournament-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <Trophy className="trophy-icon" size={24} />
            <h2>{tournament.name}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tournament Details Section */}
        <div className="tournament-details-section">
          <div className="details-grid">
            <div className="detail-item">
              <div className="detail-icon">
                <Gamepad2 size={18} />
              </div>
              <div className="detail-content">
                <span className="detail-label">Game</span>
                <span className="detail-value">{getGameName(tournament.game)}</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">
                <Calendar size={18} />
              </div>
              <div className="detail-content">
                <span className="detail-label">Created</span>
                <span className="detail-value">{formatDate(tournament.created_at)}</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">
                <AwardIcon size={18} />
              </div>
              <div className="detail-content">
                <span className="detail-label">Kill Points</span>
                <span className="detail-value">{tournament.kill_points || 1} per kill</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">
                <Trophy size={18} />
              </div>
              <div className="detail-content">
                <span className="detail-label">Status</span>
                <span className="detail-value status-badge completed">Completed</span>
              </div>
            </div>
          </div>
          <div className="action-buttons">
            <button className="action-btn standings-btn" onClick={() => scrollToSection('standings-section')}>
              Standings
            </button>
            <button className="action-btn mvp-btn" onClick={() => scrollToSection('mvps-section')}>
              MVP
            </button>
            <button className="action-btn full-view-btn" onClick={handleFullView}>
              <ExternalLink size={18} />
              Full View
            </button>
          </div>
        </div>

        <div className="modal-content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading tournament data...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
            </div>
          ) : (
            <>
              {/* Standings Section */}
              <div id="standings-section" className="standings-section">
                <div className="section-header">
                  <h3 className="section-title">Standings</h3>
                  <button className="section-full-view-btn" onClick={handleFullView}>
                    <ExternalLink size={16} />
                    Full View
                  </button>
                </div>
                {teams.length === 0 ? (
                  <div className="empty-state">
                    <Trophy size={48} className="empty-icon" />
                    <h3>No Teams</h3>
                    <p>No teams found for this tournament.</p>
                  </div>
                ) : (
                  <div className="standings-table-container">
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
                        {teams.map((team, index) => (
                          <React.Fragment key={team.id}>
                            <tr className={index < 3 ? `top-${index + 1}` : ''}>
                              <td className="rank-col">
                                <span className="rank-number">{index + 1}</span>
                              </td>
                              <td
                                className="team-col clickable"
                                onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                                style={{ cursor: 'pointer' }}
                              >
                                {team.team_name}
                                <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                                  {expandedTeam === team.id ? '▼' : '▶'}
                                </span>
                              </td>
                              <td className="matches-col">{team.points.matches_played || 0}</td>
                              <td className="wins-col">{team.points.wins || 0}</td>
                              <td className="place-col">{team.points.placement_points || 0}</td>
                              <td className="kills-col">{team.points.kill_points || 0}</td>
                              <td className="points-col">{team.total}</td>
                            </tr>
                            {expandedTeam === team.id && team.members && team.members.length > 0 && (
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
                                            <td className="player-name">{member.name || member}</td>
                                            <td>{member.matches_played || 0}</td>
                                            <td>{member.kills || 0}</td>
                                            <td>{member.wwcd || 0}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* MVPs Section */}
              <div id="mvps-section" className="mvps-section">
                <div className="section-header">
                  <h3 className="section-title">MVPs</h3>
                  <button className="section-full-view-btn" onClick={handleMVPFullView}>
                    <ExternalLink size={16} />
                    Full View
                  </button>
                </div>
                {mvps.length === 0 ? (
                  <div className="empty-state">
                    <Award size={48} className="empty-icon" />
                    <h3>No Player Data</h3>
                    <p>No player statistics available for this tournament.</p>
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
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default TournamentHistoryModal

