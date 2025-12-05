import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { subscribeToUserTournaments } from '../lib/realtime'
import { subscribeToLiveUpdates } from '../lib/liveSync'
import {
  Plus,
  Trash2,
  Edit,
  Calculator,
  Trophy,
  AlertCircle,
  X,
  Radio,
  Flag,
  Award,
  BarChart3
} from 'lucide-react'
import AddTeamsModal from './modals/AddTeamsModal'
import CalculateResultsModal from './modals/CalculateResultsModal'
import EditTournamentModal from './modals/EditTournamentModal'
import CreateTournamentModal from './modals/CreateTournamentModal'
import LiveTournamentModal from './modals/LiveTournamentModal'
import MVPsModal from './modals/MVPsModal'
import LeaderboardModal from './modals/LeaderboardModal'
import './TabContent.css'
import { useToast } from '../context/ToastContext'
import ConfirmationModal from './ConfirmationModal'

function HomeContent({ newTournament, onTournamentProcessed }) {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isTeamsModalOpen, setIsTeamsModalOpen] = useState(false)
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [teamCounts, setTeamCounts] = useState({})
  const [isCalculateModalOpen, setIsCalculateModalOpen] = useState(false)
  const [calculateTournament, setCalculateTournament] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editTournament, setEditTournament] = useState(null)
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false)
  const [liveTournament, setLiveTournament] = useState(null)
  const [isMVPsModalOpen, setIsMVPsModalOpen] = useState(false)
  const [mvpsTournament, setMvpsTournament] = useState(null)
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false)
  const [leaderboardTournament, setLeaderboardTournament] = useState(null)
  const { addToast } = useToast()
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, tournamentId: null, tournamentName: null })
  const [confirmEnd, setConfirmEnd] = useState({ isOpen: false, tournamentId: null, tournamentName: null })

  // State for AI extraction (assuming these are needed for the new AI card)
  const [extracting, setExtracting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false) // Assuming this state is needed for the empty state button

  useEffect(() => {
    let unsubscribeTournaments = null
    let unsubscribeChannel = null

    const init = async () => {
      await fetchTournaments()

      // Set up realtime subscription for this user's tournaments
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      unsubscribeTournaments = subscribeToUserTournaments(user.id, () => {
        // Refetch whenever tournaments table changes for this user
        fetchTournaments()
      })

      // Listen for local "results updated" events (from CalculateResultsModal)
      unsubscribeChannel = subscribeToLiveUpdates((message) => {
        if (message?.type === 'results-updated') {
          // Results changed for some tournament – refresh dashboard data
          console.log('📣 Dashboard received results-updated event, refreshing tournaments...')
          fetchTournaments()
        }
      })
    }

    init()

    return () => {
      if (typeof unsubscribeTournaments === 'function') {
        unsubscribeTournaments()
      }
      if (typeof unsubscribeChannel === 'function') {
        unsubscribeChannel()
      }
    }
  }, [])

  // Auto-open teams modal when a new tournament is created
  useEffect(() => {
    if (newTournament) {
      console.log('🎯 Auto-opening teams modal for new tournament:', newTournament.name)
      setSelectedTournament(newTournament)
      setIsTeamsModalOpen(true)
    }
  }, [newTournament])

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      console.log('📥 Fetching tournaments from Supabase...')

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

      console.log('✅ Tournaments fetched:', data)
      setTournaments(data || [])
      setError(null)

      // Fetch team counts for each tournament
      const counts = {}
      for (const tournament of (data || [])) {
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
      setError('Failed to load tournaments')
      setTournaments([])
    } finally {
      setLoading(false)
    }
  }

  const activeTournaments = tournaments.filter(t => t.status === 'active')
  const pastTournaments = tournaments.filter(t => t.status === 'completed')

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getGameIcon = (game) => {
    const icons = {
      freeFire: '🔥',
      bgmi: '🎮',
      other: '◆',
    }
    return icons[game] || '◆'
  }

  const handleAddTeamsClick = (tournament) => {
    console.log('Opening teams modal for:', tournament.name)
    setSelectedTournament(tournament)
    setIsTeamsModalOpen(true)
  }

  const handleCalculateClick = (tournament) => {
    console.log('Opening calculate modal for:', tournament.name)
    setCalculateTournament(tournament)
    setIsCalculateModalOpen(true)
  }

  const handleCloseCalculateModal = () => {
    setIsCalculateModalOpen(false)
    setCalculateTournament(null)
    // Refresh team counts after calculating
    fetchTournaments()
  }

  const handleEditClick = (tournament) => {
    console.log('Opening edit modal for:', tournament.name)
    setEditTournament(tournament)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditTournament(null)
  }

  const handleEditTournamentSave = async () => {
    console.log('Tournament updated, refreshing list...')
    setIsEditModalOpen(false)
    setEditTournament(null)
    // Refresh tournaments list
    fetchTournaments()
  }

  const handleMVPsClick = (tournament) => {
    console.log('Opening MVPs modal for:', tournament.name)
    setMvpsTournament(tournament)
    setIsMVPsModalOpen(true)
  }

  const handleCloseMVPsModal = () => {
    setIsMVPsModalOpen(false)
    setMvpsTournament(null)
  }

  const handleLeaderboardClick = (tournament) => {
    console.log('Opening leaderboard modal for:', tournament.name)
    setLeaderboardTournament(tournament)
    setIsLeaderboardModalOpen(true)
  }

  const handleCloseLeaderboardModal = () => {
    setIsLeaderboardModalOpen(false)
    setLeaderboardTournament(null)
  }





  const getTeamCount = async (tournamentId) => {
    try {
      const { count, error } = await supabase
        .from('tournament_teams')
        .select('*', { count: 'exact' })
        .eq('tournament_id', tournamentId)

      if (error) {
        console.error('Error fetching team count:', error)
        return 0
      }
      return count || 0
    } catch (err) {
      console.error('Exception fetching team count:', err)
      return 0
    }
  }

  const handleCreateTournament = async (tournamentData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        try {
          addToast('warning', 'You must be logged in to create a tournament')
        } catch (e) {
          console.error('Toast failed:', e)
        }
        return
      }

      const { data, error } = await supabase
        .from('tournaments')
        .insert([
          {
            name: tournamentData.name,
            game: tournamentData.game,
            points_system: tournamentData.pointsSystem,
            kill_points: tournamentData.killPoints,
            user_id: user.id,
            status: 'active'
          }
        ])
        .select()

      if (error) throw error

      console.log('✅ Tournament created:', data)
      setShowAddModal(false)
      fetchTournaments()

      // Open teams modal for the new tournament
      if (data && data[0]) {
        setSelectedTournament(data[0])
        setIsTeamsModalOpen(true)
      }
    } catch (error) {
      console.error('Error creating tournament:', error)
      try {
        addToast('error', 'Failed to create tournament: ' + error.message)
      } catch (e) {
        console.error('Toast failed:', e)
      }
    }
  }

  const handleAddTeams = async (teams) => {
    try {
      console.log('Saving teams for', selectedTournament.name, ':', teams)

      // Prepare team data - extract team name from object
      const teamsData = teams.map(team => ({
        tournament_id: selectedTournament.id,
        team_name: team.name || team, // Handle both object and string formats
        members: team.members || [],
        total_points: {
          matches_played: 0,
          wins: 0,
          kill_points: 0,
          placement_points: 0
        }
      }))

      console.log('📤 Sending to database:', teamsData)

      // Save to database
      const { data, error } = await supabase
        .from('tournament_teams')
        .insert(teamsData)

      if (error) {
        console.error('❌ Error saving teams:', error)
        try {
          addToast('error', `❌ Error: ${error.message} `)
        } catch (e) {
          console.error('Toast failed:', e)
        }
        return
      }

      console.log('✅ Teams saved successfully:', data)
      try {
        addToast('success', `✅ Added ${teams.length} teams to ${selectedTournament.name} !`)
      } catch (e) {
        console.error('Toast failed:', e)
      }

      // Close modal and refresh
      setIsTeamsModalOpen(false)
      setSelectedTournament(null)

      // Notify parent that we've processed the new tournament
      if (onTournamentProcessed) {
        onTournamentProcessed()
      }

      // Refresh tournaments list
      fetchTournaments()
    } catch (err) {
      console.error('❌ Exception saving teams:', err)
      try {
        addToast('error', '❌ Failed to save teams')
      } catch (e) {
        console.error('Toast failed:', e)
      }
    }
  }

  const handleCloseTeamsModal = () => {
    setIsTeamsModalOpen(false)
    setSelectedTournament(null)
    // Notify parent that we've processed the new tournament
    if (onTournamentProcessed) {
      onTournamentProcessed()
    }
  }

  const handleDeleteTournament = (tournamentId, tournamentName) => {
    setConfirmDelete({ isOpen: true, tournamentId, tournamentName })
  }

  const handleConfirmDelete = async () => {
    const { tournamentId, tournamentName } = confirmDelete
    setConfirmDelete({ isOpen: false, tournamentId: null, tournamentName: null })

    try {
      console.log('🗑️ Deleting tournament:', tournamentId)

      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId)

      if (error) {
        console.error('❌ Error deleting tournament:', error)
        try {
          addToast('error', `❌ Error: ${error.message} `)
        } catch (e) {
          console.error('Toast failed:', e)
        }
        return
      }

      console.log('✅ Tournament deleted successfully')
      try {
        addToast('success', `✅ "${tournamentName}" deleted!`)
      } catch (e) {
        console.error('Toast failed:', e)
      }

      // Refresh tournaments list
      fetchTournaments()
    } catch (err) {
      console.error('❌ Exception deleting tournament:', err)
      try {
        addToast('error', '❌ Failed to delete tournament')
      } catch (e) {
        console.error('Toast failed:', e)
      }
    }
  }

  const handleGoLive = (tournament) => {
    console.log('Opening live modal for:', tournament.name)
    setLiveTournament(tournament)
    setIsLiveModalOpen(true)
  }

  const handleCloseLiveModal = () => {
    setIsLiveModalOpen(false)
    setLiveTournament(null)
  }

  const handleEndTournament = (tournamentId, tournamentName) => {
    setConfirmEnd({ isOpen: true, tournamentId, tournamentName })
  }

  const handleConfirmEndTournament = async () => {
    const { tournamentId, tournamentName } = confirmEnd
    setConfirmEnd({ isOpen: false, tournamentId: null, tournamentName: null })

    try {
      console.log('🏁 Ending tournament:', tournamentId)

      // Fetch current teams and calculate final standings
      const { data: teamsData, error: teamsError } = await supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', tournamentId)

      if (teamsError) throw teamsError

      // Calculate final standings
      const finalStandings = (teamsData || []).map(team => {
        const points = typeof team.total_points === 'object'
          ? team.total_points
          : { kill_points: 0, placement_points: 0, matches_played: 0, wins: 0 }

        const total = (points.kill_points || 0) + (points.placement_points || 0)

        return {
          team_id: team.id,
          team_name: team.team_name,
          rank: 0, // Will be set after sorting
          matches_played: points.matches_played || 0,
          wins: points.wins || 0,
          placement_points: points.placement_points || 0,
          kill_points: points.kill_points || 0,
          total_points: total
        }
      })
        .sort((a, b) => b.total_points - a.total_points)
        .map((team, index) => ({
          ...team,
          rank: index + 1
        }))

      console.log('📊 Final standings calculated:', finalStandings)

      // Update tournament with final standings and status
      // Try to update with final_standings, if column doesn't exist, just update status
      const { error } = await supabase
        .from('tournaments')
        .update({ 
          status: 'completed',
          final_standings: finalStandings
        })
        .eq('id', tournamentId)

      if (error) {
        // If final_standings column doesn't exist, try updating just the status
        if (error.message && error.message.includes('final_standings')) {
          console.warn('⚠️ final_standings column not found, updating status only')
          const { error: statusError } = await supabase
            .from('tournaments')
            .update({ status: 'completed' })
            .eq('id', tournamentId)

          if (statusError) {
            console.error('❌ Error ending tournament:', statusError)
            try {
              addToast('error', `❌ Error: ${statusError.message}. Please add final_standings column to database.`)
            } catch (e) {
              console.error('Toast failed:', e)
            }
            return
          }

          // Show warning about missing column
          try {
            addToast('warning', '⚠️ Tournament ended but final standings could not be saved. Please add final_standings column to database.')
          } catch (e) {
            console.error('Toast failed:', e)
          }
        } else {
          console.error('❌ Error ending tournament:', error)
          try {
            addToast('error', `❌ Error: ${error.message} `)
          } catch (e) {
            console.error('Toast failed:', e)
          }
          return
        }
      }

      console.log('✅ Tournament ended successfully with final standings stored')
      try {
        addToast('success', `✅ "${tournamentName}" moved to past tournaments!`)
      } catch (e) {
        console.error('Toast failed:', e)
      }

      // Refresh tournaments list
      fetchTournaments()
    } catch (err) {
      console.error('❌ Exception ending tournament:', err)
      try {
        addToast('error', '❌ Failed to end tournament')
      } catch (e) {
        console.error('Toast failed:', e)
      }
    }
  }

  // Placeholder for AI extraction function, as it's referenced in the new snippet
  const handleAiExtraction = () => {
    console.log("AI Extraction triggered (function not fully implemented in HomeContent)");
    // This would typically involve opening a file picker and then calling extractTeamsFromImage
  }

  return (
    <div className="tab-content">
      <div className="content-header">
        <h2>Home</h2>
        <p>Manage your tournaments and view past events</p>
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

        {/* This AI card snippet was provided in the instruction, placed here as per diff */}
        {/* Note: `setShowAddModal` is not defined in HomeContent, assuming it's a placeholder or intended for a different component */}
        {/* <div className="modal-header">
            <h3>Add Teams</h3>
            <button className="close-btn" onClick={() => setShowAddModal(false)}>
              <X size={20} />
            </button>
          </div> */}

        <div className="section">
          <h3>Active Tournaments</h3>
          {loading ? (
            <div className="loading-state">
              <p>Loading tournaments...</p>
            </div>
          ) : activeTournaments.length > 0 ? (
            <div className="tournaments-list">
              {activeTournaments.map((tournament) => (
                <div key={tournament.id} className="tournament-row">
                  <div className="tournament-row-info">
                    <h4>{tournament.name}</h4>
                    <div className="tournament-meta-info">
                      <span className="team-count-badge">{teamCounts[tournament.id] || 0} Teams</span>
                      <span className="created-date">{formatDate(tournament.created_at)}</span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleGoLive(tournament)
                      }}
                      title="Go Live"
                    >
                      <Radio size={18} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCalculateClick(tournament)
                      }}
                      title="Calculate Points"
                    >
                      <Calculator size={18} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditClick(tournament)
                      }}
                      title="Edit Tournament"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEndTournament(tournament.id, tournament.name)
                      }}
                      title="End Tournament"
                    >
                      <Flag size={18} />
                    </button>
                    <button
                      className="icon-btn delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTournament(tournament.id, tournament.name)
                      }}
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <Trophy size={48} />
              </div>
              <h3>No Tournaments Yet</h3>
              <p>Create your first tournament to get started</p>
              <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                <Plus size={18} />
                Create Tournament
              </button>
            </div>
          )}
        </div>

        {/* Past Tournaments Section */}
        <div className="section">
          <h3>Past Tournaments</h3>
          {loading ? (
            <div className="loading-state">
              <p>Loading tournaments...</p>
            </div>
          ) : pastTournaments.length > 0 ? (
            <div className="tournaments-list">
              {pastTournaments.map((tournament) => (
                <div key={tournament.id} className="tournament-row">
                  <div className="tournament-row-info">
                    <h4>{tournament.name}</h4>
                    <div className="tournament-meta-info">
                      <span className="team-count-badge">{teamCounts[tournament.id] || 0} Teams</span>
                      <span className="created-date">{formatDate(tournament.created_at)}</span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLeaderboardClick(tournament)
                      }}
                      title="Leaderboard"
                    >
                      <BarChart3 size={18} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMVPsClick(tournament)
                      }}
                      title="MVPs"
                    >
                      <Award size={18} />
                    </button>
                    <button
                      className="icon-btn delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTournament(tournament.id, tournament.name)
                      }}
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <Trophy size={48} />
              </div>
              <h3>No Past Tournaments</h3>
              <p>Completed tournaments will appear here</p>
            </div>
          )}
        </div>

      </div>

      {/* Add Teams Modal */}
      <AddTeamsModal
        isOpen={isTeamsModalOpen}
        onClose={handleCloseTeamsModal}
        onSubmit={handleAddTeams}
        tournamentName={selectedTournament?.name}
      />

      {/* Calculate Results Modal */}
      <CalculateResultsModal
        isOpen={isCalculateModalOpen}
        onClose={handleCloseCalculateModal}
        tournament={calculateTournament}
      />

      {/* Edit Tournament Modal */}
      <EditTournamentModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        tournament={editTournament}
        onUpdate={handleEditTournamentSave}
      />




      {/* Create Tournament Modal */}
      <CreateTournamentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreateTournament}
      />
      {/* Live Tournament Modal */}
      <LiveTournamentModal
        isOpen={isLiveModalOpen}
        onClose={handleCloseLiveModal}
        tournament={liveTournament}
      />

      {/* MVPs Modal */}
      <MVPsModal
        isOpen={isMVPsModalOpen}
        onClose={handleCloseMVPsModal}
        tournament={mvpsTournament}
      />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardModalOpen}
        onClose={handleCloseLeaderboardModal}
        tournament={leaderboardTournament}
      />

      {/* Confirmation Modal for Delete */}
      <ConfirmationModal
        isOpen={confirmDelete.isOpen}
        title="Delete Tournament"
        message={`Are you sure you want to delete "${confirmDelete.tournamentName}"? This cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete({ isOpen: false, tournamentId: null, tournamentName: null })}
      />

      {/* Confirmation Modal for End Tournament */}
      <ConfirmationModal
        isOpen={confirmEnd.isOpen}
        title="End Tournament"
        message={`Are you sure you want to end "${confirmEnd.tournamentName}"? It will be moved to past tournaments.`}
        onConfirm={handleConfirmEndTournament}
        onCancel={() => setConfirmEnd({ isOpen: false, tournamentId: null, tournamentName: null })}
      />
    </div>
  )
}

export default HomeContent

