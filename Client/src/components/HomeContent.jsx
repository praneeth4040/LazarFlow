import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { extractTeamsFromImage } from '../lib/aiExtraction'
import {
  MoreVertical,
  Plus,
  Trash2,
  Share2,
  Edit,
  Table,
  Calculator,
  Users,
  Trophy,
  AlertCircle,
  Check,
  X
} from 'lucide-react'
import AddTeamsModal from './AddTeamsModal'
import CalculateResultsModal from './CalculateResultsModal'
import EditTournamentModal from './EditTournamentModal'
import ShareTournamentModal from './ShareTournamentModal'
import PointsTableModal from './PointsTableModal'
import './TabContent.css'

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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareTournament, setShareTournament] = useState(null)
  const [isPointsTableOpen, setIsPointsTableOpen] = useState(false)
  const [pointsTableTournament, setPointsTableTournament] = useState(null)
  // State for AI extraction (assuming these are needed for the new AI card)
  const [extracting, setExtracting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false) // Assuming this state is needed for the empty state button

  useEffect(() => {
    fetchTournaments()
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

  const handleShareClick = (tournament) => {
    console.log('Opening share modal for:', tournament.name)
    setShareTournament(tournament)
    setIsShareModalOpen(true)
  }

  const handleCloseShareModal = () => {
    setIsShareModalOpen(false)
    setShareTournament(null)
  }

  const handleTablesClick = (tournament) => {
    console.log('Opening points table modal for:', tournament.name)
    setPointsTableTournament(tournament)
    setIsPointsTableOpen(true)
  }

  const handleClosePointsTableModal = () => {
    setIsPointsTableOpen(false)
    setPointsTableTournament(null)
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

  const handleAddTeams = async (teams) => {
    try {
      console.log('Saving teams for', selectedTournament.name, ':', teams)

      // Prepare team data - extract team name from object
      const teamsData = teams.map(team => ({
        tournament_id: selectedTournament.id,
        team_name: team.name || team, // Handle both object and string formats
        captain_name: null,
        members: [],
        total_points: 0
      }))

      console.log('📤 Sending to database:', teamsData)

      // Save to database
      const { data, error } = await supabase
        .from('tournament_teams')
        .insert(teamsData)

      if (error) {
        console.error('❌ Error saving teams:', error)
        alert(`❌ Error: ${error.message} `)
        return
      }

      console.log('✅ Teams saved successfully:', data)
      alert(`✅ Added ${teams.length} teams to ${selectedTournament.name} !`)

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
      alert('❌ Failed to save teams')
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

  const handleDeleteTournament = async (tournamentId, tournamentName) => {
    if (!window.confirm(`Are you sure you want to delete "${tournamentName}" ? `)) {
      return
    }

    try {
      console.log('🗑️ Deleting tournament:', tournamentId)

      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId)

      if (error) {
        console.error('❌ Error deleting tournament:', error)
        alert(`❌ Error: ${error.message} `)
        return
      }

      console.log('✅ Tournament deleted successfully')
      alert(`✅ "${tournamentName}" deleted!`)

      // Refresh tournaments list
      fetchTournaments()
    } catch (err) {
      console.error('❌ Exception deleting tournament:', err)
      alert('❌ Failed to delete tournament')
    }
  }

  const handleEditTournament = (tournament) => {
    console.log('Opening edit menu for:', tournament.name)
    handleEditClick(tournament)
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
        <div className="ai-card" onClick={handleAiExtraction}>
          <div className="ai-icon">
            <Users size={24} />
          </div>
          <div className="ai-content">
            <h4>Extract from Screenshot</h4>
            <p>Upload a screenshot of the lobby to auto-extract team names</p>
          </div>
          {extracting && <div className="spinner"></div>}
        </div>

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
                        handleTablesClick(tournament)
                      }}
                      title="View Table"
                    >
                      <Table size={18} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleShareClick(tournament)
                      }}
                      title="Share"
                    >
                      <Share2 size={18} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditTournament(tournament)
                      }}
                      title="Edit Tournament"
                    >
                      <Edit size={18} />
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

      {/* Share Tournament Modal */}
      <ShareTournamentModal
        isOpen={isShareModalOpen}
        onClose={handleCloseShareModal}
        tournament={shareTournament}
      />

      {/* Points Table Modal */}
      <PointsTableModal
        isOpen={isPointsTableOpen}
        onClose={handleClosePointsTableModal}
        tournament={pointsTableTournament}
      />
    </div>
  )
}

export default HomeContent

