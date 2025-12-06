import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { subscribeToUserTournaments } from '../lib/realtime'
import PointsTable from './PointsTable'
import TeamDetailsModal from './modals/TeamDetailsModal'
import TournamentStandingsModal from './modals/TournamentStandingsModal'
import GameScreensModal from './modals/GameScreensModal'
import {
  Trophy,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Table,
  Flame,
  Gamepad2,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react'
import './TabContent.css'

function HistoryContent() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedTournament, setExpandedTournament] = useState(null)
  const [tournamentTeams, setTournamentTeams] = useState({})
  const [teamCounts, setTeamCounts] = useState({})
  const [loadingTeams, setLoadingTeams] = useState({})
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false)
  const [isStandingsModalOpen, setIsStandingsModalOpen] = useState(false)
  const [standingsTournament, setStandingsTournament] = useState(null)
  const [isGameScreensModalOpen, setIsGameScreensModalOpen] = useState(false)
  const [gameScreensTournament, setGameScreensTournament] = useState(null)
  const [userEmail, setUserEmail] = useState(null)

  useEffect(() => {
    let unsubscribeTournaments = null

    const init = async () => {
      await fetchTournaments()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserEmail(user.email) // Store user email for image fetching

      unsubscribeTournaments = subscribeToUserTournaments(user.id, () => {
        fetchTournaments()
      })
    }

    init()

    return () => {
      if (typeof unsubscribeTournaments === 'function') {
        unsubscribeTournaments()
      }
    }
  }, [])

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      console.log('📥 Fetching all tournaments for history...')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not logged in')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('❌ Fetch error:', fetchError)
        throw fetchError
      }

      console.log('✅ All tournaments fetched:', data)

      // Get all completed tournaments (not just skip first 2)
      const allTournaments = data || []
      const historyTournaments = allTournaments.filter(t => t.status === 'completed')

      console.log(`📊 Found ${historyTournaments.length} completed tournaments for history`)

      setTournaments(historyTournaments)
      setError(null)

      // Fetch team counts for each tournament
      const counts = {}
      for (const tournament of historyTournaments) {
        const { count, error: countError } = await supabase
          .from('tournament_teams')
          .select('*', { count: 'exact' })
          .eq('tournament_id', tournament.id)

        if (!countError) {
          counts[tournament.id] = count || 0
        }
      }
      setTeamCounts(counts)
      console.log('✅ Team counts fetched:', counts)
    } catch (err) {
      console.error('❌ Error fetching tournaments:', err.message)
      setError('Failed to load tournament history')
      setTournaments([])
    } finally {
      setLoading(false)
    }
  }

  const fetchTournamentTeams = async (tournamentId) => {
    if (tournamentTeams[tournamentId]) {
      return // Already fetched
    }

    try {
      setLoadingTeams(prev => ({ ...prev, [tournamentId]: true }))

      const { data, error } = await supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', tournamentId)

      if (error) throw error

      // Process and sort teams by total points (position)
      const processedTeams = (data || []).map(team => {
        const points = typeof team.total_points === 'object' && team.total_points !== null
          ? team.total_points
          : { kill_points: 0, placement_points: 0, matches_played: 0, wins: 0 }

        const killPoints = points.kill_points || 0
        const placementPoints = points.placement_points || 0
        const total = killPoints + placementPoints

        return {
          ...team,
          points,
          total_points: total, // For PointsTable compatibility
          kill_points: killPoints,
          placement_points: placementPoints,
          matches_played: points.matches_played || 0,
          wins: points.wins || 0
        }
      }).sort((a, b) => b.total_points - a.total_points) // Sort by total points descending

      setTournamentTeams(prev => ({
        ...prev,
        [tournamentId]: processedTeams
      }))
    } catch (err) {
      console.error('Error fetching teams:', err)
      setTournamentTeams(prev => ({
        ...prev,
        [tournamentId]: []
      }))
    } finally {
      setLoadingTeams(prev => ({ ...prev, [tournamentId]: false }))
    }
  }

  const handleToggleExpand = async (tournamentId) => {
    console.log('🔄 Toggling tournament expansion:', tournamentId)
    if (expandedTournament === tournamentId) {
      setExpandedTournament(null)
    } else {
      setExpandedTournament(tournamentId)
      await fetchTournamentTeams(tournamentId)
      console.log('✅ Teams fetched for tournament:', tournamentId)
    }
  }

  const handleViewTeams = (tournament) => {
    setSelectedTournament(tournament)
    setIsTeamDetailsOpen(true)
    // Ensure teams are loaded
    if (!tournamentTeams[tournament.id]) {
      fetchTournamentTeams(tournament.id)
    }
  }

  const handleViewStandings = (tournament) => {
    console.log('📊 Opening standings modal for tournament:', tournament?.name, tournament?.id)
    if (!tournament || !tournament.id) {
      console.error('❌ Invalid tournament data:', tournament)
      return
    }
    setStandingsTournament(tournament)
    setIsStandingsModalOpen(true)
  }

  const handleViewGameScreens = (tournament) => {
    console.log('🖼️ Opening game screens modal for tournament:', tournament?.name)
    if (!tournament || !tournament.id) {
      console.error('❌ Invalid tournament data:', tournament)
      return
    }
    setGameScreensTournament(tournament)
    setIsGameScreensModalOpen(true)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getGameIcon = (game) => {
    const icons = {
      freeFire: <Flame size={20} style={{ color: '#ff6b35' }} />,
      bgmi: <Gamepad2 size={20} style={{ color: '#10b981' }} />,
      other: <Sparkles size={20} style={{ color: '#8b5cf6' }} />,
    }
    return icons[game] || <Sparkles size={20} style={{ color: '#8b5cf6' }} />
  }

  const getStatusBadge = (status) => {
    const badges = {
      active: { text: 'Active', color: '#10b981' },
      completed: { text: 'Completed', color: '#6366f1' },
      cancelled: { text: 'Cancelled', color: '#ef4444' }
    }
    const badge = badges[status] || badges.active
    return (
      <span
        className="status-badge"
        style={{
          background: `${badge.color}20`,
          color: badge.color,
          padding: '0.25rem 0.75rem',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: '600'
        }}
      >
        {badge.text}
      </span>
    )
  }

  return (
    <div className="tab-content">
      <div className="content-header">
        <h2>Tournament History</h2>
        <p>View all your past tournaments and their details</p>
      </div>

      <div className="content-body">
        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <p>{error}</p>
            <button onClick={fetchTournaments} className="retry-btn">
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <p>Loading tournament history...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Trophy size={48} />
            </div>
            <h3>No Tournament History</h3>
            <p>Your completed tournaments will appear here once you end a tournament</p>
          </div>
        ) : (
          <div className="section">
            <div className="tournaments-list">
              {tournaments.map((tournament) => {
                const isExpanded = expandedTournament === tournament.id
                const teams = tournamentTeams[tournament.id] || []
                const teamCount = teamCounts[tournament.id] || 0

                return (
                  <div key={tournament.id} className="tournament-history-card">
                    <div
                      className="tournament-history-header"
                      onClick={() => handleToggleExpand(tournament.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="tournament-history-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center' }}>{getGameIcon(tournament.game)}</span>
                          <h4>{tournament.name}</h4>
                        </div>
                        <div className="tournament-meta-info">
                          <span className="team-count-badge">{teamCount} Teams</span>
                          <span className="created-date">
                            <Calendar size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                            {formatDate(tournament.created_at)}
                          </span>
                          {getStatusBadge(tournament.status)}
                        </div>
                      </div>
                      <button className="expand-btn">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="tournament-history-details">
                        <div className="tournament-details-grid">
                          <div className="detail-item">
                            <span className="detail-label">Game:</span>
                            <span className="detail-value">{tournament.game || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Kill Points:</span>
                            <span className="detail-value">{tournament.kill_points || 1} per kill</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Points System:</span>
                            <span className="detail-value">
                              {tournament.points_system ? 'Custom' : 'Default'}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Created:</span>
                            <span className="detail-value">{formatDate(tournament.created_at)}</span>
                          </div>
                        </div>

                        {loadingTeams[tournament.id] ? (
                          <div className="no-teams-message" style={{ padding: '2rem', textAlign: 'center' }}>
                            <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '3px solid #e2e8f0', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}></div>
                            <p>Loading teams...</p>
                          </div>
                        ) : teams.length > 0 ? (
                          <div className="tournament-standings-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                              <h5 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>Tournament Standings</h5>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  className="btn-primary"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewGameScreens(tournament)
                                  }}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = '#059669'}
                                  onMouseLeave={(e) => e.target.style.background = '#10b981'}
                                >
                                  <ImageIcon size={16} />
                                  View Game Screens
                                </button>
                                <button
                                  className="btn-primary"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewStandings(tournament)
                                  }}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    background: '#1a73e8',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = '#1557b0'}
                                  onMouseLeave={(e) => e.target.style.background = '#1a73e8'}
                                >
                                  <Table size={16} />
                                  Full View
                                </button>
                              </div>
                            </div>
                            <PointsTable teams={teams} tournament={tournament} />
                          </div>
                        ) : teamCount > 0 ? (
                          <div className="no-teams-message">
                            <Users size={24} />
                            <p>Teams are being loaded...</p>
                          </div>
                        ) : (
                          <div className="no-teams-message">
                            <Users size={24} />
                            <p>No teams added to this tournament</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Team Details Modal */}
      {selectedTournament && (
        <TeamDetailsModal
          isOpen={isTeamDetailsOpen}
          onClose={() => {
            setIsTeamDetailsOpen(false)
            setSelectedTournament(null)
          }}
          tournament={selectedTournament}
          teams={tournamentTeams[selectedTournament.id] || []}
        />
      )}

      {/* Tournament Standings Modal */}
      {standingsTournament && (
        <TournamentStandingsModal
          isOpen={isStandingsModalOpen}
          onClose={() => {
            setIsStandingsModalOpen(false)
            setStandingsTournament(null)
          }}
          tournament={standingsTournament}
        />
      )}

      {/* Game Screens Modal */}
      {gameScreensTournament && userEmail && (
        <GameScreensModal
          isOpen={isGameScreensModalOpen}
          onClose={() => {
            setIsGameScreensModalOpen(false)
            setGameScreensTournament(null)
          }}
          tournament={gameScreensTournament}
          userEmail={userEmail}
        />
      )}
    </div>
  )
}

export default HistoryContent

