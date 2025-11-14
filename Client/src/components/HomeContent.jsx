import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import AddTeamsModal from './AddTeamsModal'
import CalculateResultsModal from './CalculateResultsModal'
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
        alert(`❌ Error: ${error.message}`)
        return
      }
      
      console.log('✅ Teams saved successfully:', data)
      alert(`✅ Added ${teams.length} teams to ${selectedTournament.name}!`)
      
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
    if (!window.confirm(`Are you sure you want to delete "${tournamentName}"?`)) {
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
        alert(`❌ Error: ${error.message}`)
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
    // Show edit options/modal
    const editOptions = `
    Options for "${tournament.name}":
    1. Edit tournament details
    2. Delete tournament
    
    Use the delete option with caution!
    `
    
    if (window.confirm(`${editOptions}\n\nClick OK for edit, Cancel to close`)) {
      // TODO: Open tournament edit modal
      alert('Edit functionality coming soon!')
    }
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
            <p>{error}</p>
            <button onClick={fetchTournaments} className="retry-btn">
              Retry
            </button>
          </div>
        )}

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

                  <div className="tournament-row-buttons">
                    <button 
                      className="tournament-btn calculate-btn" 
                      title="Calculate Results"
                      onClick={() => handleCalculateClick(tournament)}
                    >
                      Calculate
                    </button>
                    <button className="tournament-btn tables-btn" title="View Points Table">
                      Tables
                    </button>
                    <button className="tournament-btn warheads-btn" title="View Warheads">
                      WarHeads
                    </button>
                    <button className="tournament-btn fraggers-btn" title="View Top Fraggers">
                      Fraggers
                    </button>
                    <button className="tournament-btn posters-btn" title="Team Posters">
                      Team Posters
                    </button>
                    <button className="tournament-btn slot-btn" title="Slot List">
                      Slot List
                    </button>
                    <button className="tournament-btn share-btn" title="Share Tournament">
                      Share
                    </button>
                    <button 
                      className="tournament-btn edit-btn" 
                      title="Edit or Delete"
                      onClick={() => handleEditTournament(tournament)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">▲</div>
              <p>No active tournaments yet</p>
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
    </div>
  )
}

export default HomeContent

