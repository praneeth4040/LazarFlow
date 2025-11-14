import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import AddTeamsModal from './AddTeamsModal'
import TeamDetailsModal from './TeamDetailsModal'
import './TabContent.css'

function HomeContent() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isTeamsModalOpen, setIsTeamsModalOpen] = useState(false)
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false)
  const [teamsForDetails, setTeamsForDetails] = useState([])

  useEffect(() => {
    fetchTournaments()
  }, [])

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
      
      // Close teams modal and fetch the saved teams to display
      setIsTeamsModalOpen(false)
      
      // Fetch teams and open details modal
      const { data: fetchedTeams, error: fetchError } = await supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', selectedTournament.id)
      
      if (fetchError) {
        console.error('❌ Error fetching teams:', fetchError)
        alert(`✅ Added ${teams.length} teams!`)
        return
      }
      
      console.log('✅ Fetched teams:', fetchedTeams)
      setTeamsForDetails(fetchedTeams)
      setIsTeamDetailsOpen(true)
      
    } catch (err) {
      console.error('❌ Exception saving teams:', err)
      alert('❌ Failed to save teams')
    }
  }

  const handleCloseTeamsModal = () => {
    setIsTeamsModalOpen(false)
    setSelectedTournament(null)
  }

  const handleCloseTeamDetails = () => {
    setIsTeamDetailsOpen(false)
    setTeamsForDetails([])
    setSelectedTournament(null)
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
            <div className="tournaments-grid">
              {activeTournaments.map((tournament) => (
                <div key={tournament.id} className="tournament-card">
                  <div className="tournament-header">
                    <h4>{tournament.name}</h4>
                    <span className="game-badge">{getGameIcon(tournament.game)} {tournament.game === 'freeFire' ? 'Free Fire' : tournament.game === 'bgmi' ? 'BGMI' : 'Other'}</span>
                  </div>
                  <div className="tournament-details">
                    <p><strong>Created:</strong> {formatDate(tournament.created_at)}</p>
                    <p><strong>Kill Points:</strong> {tournament.kill_points}</p>
                    <p><strong>Placements:</strong> {tournament.points_system?.length || 0}</p>
                  </div>
                  <div className="tournament-actions">
                    <button 
                      className="action-btn teams-btn"
                      onClick={() => handleAddTeamsClick(tournament)}
                    >
                      ➕ Teams
                    </button>
                    <button className="action-btn edit-btn">Edit</button>
                    <button className="action-btn delete-btn">Delete</button>
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

        <div className="section">
          <h3>Past Tournaments</h3>
          {pastTournaments.length > 0 ? (
            <div className="tournaments-grid">
              {pastTournaments.map((tournament) => (
                <div key={tournament.id} className="tournament-card completed">
                  <div className="tournament-header">
                    <h4>{tournament.name}</h4>
                    <span className="game-badge">{getGameIcon(tournament.game)} {tournament.game === 'freeFire' ? 'Free Fire' : tournament.game === 'bgmi' ? 'BGMI' : 'Other'}</span>
                  </div>
                  <div className="tournament-details">
                    <p><strong>Created:</strong> {formatDate(tournament.created_at)}</p>
                    <p><strong>Kill Points:</strong> {tournament.kill_points}</p>
                    <p><strong>Placements:</strong> {tournament.points_system?.length || 0}</p>
                  </div>
                  <div className="tournament-actions">
                    <button className="action-btn view-btn">View</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">◆</div>
              <p>No past tournaments</p>
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

      {/* Team Details Modal */}
      <TeamDetailsModal
        isOpen={isTeamDetailsOpen}
        onClose={handleCloseTeamDetails}
        tournament={selectedTournament}
        teams={teamsForDetails}
      />
    </div>
  )
}

export default HomeContent

