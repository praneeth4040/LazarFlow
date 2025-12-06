import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Trophy, AlertCircle } from 'lucide-react'
import TournamentHistoryModal from './modals/TournamentHistoryModal'
import './TabContent.css'

function HistoryContent() {
  const [pastTournaments, setPastTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  useEffect(() => {
    fetchPastTournaments()
  }, [])

  const fetchPastTournaments = async () => {
    try {
      setLoading(true)
      console.log(' Fetching past tournaments from Supabase...')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not logged in')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error(' Fetch error:', fetchError)
        throw fetchError
      }

      console.log(' Past tournaments fetched:', data)
      setPastTournaments(data || [])
      setError(null)
    } catch (err) {
      console.error(' Error fetching past tournaments:', err.message)
      setError('Failed to load past tournaments')
      setPastTournaments([])
    } finally {
      setLoading(false)
    }
  }

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

  const handleTournamentClick = (tournament) => {
    setSelectedTournament(tournament)
    setIsHistoryModalOpen(true)
  }

  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false)
    setSelectedTournament(null)
  }

  return (
    <div className="tab-content">
      <div className="content-header">
        <h2>History</h2>
        <p>View your completed tournaments</p>
      </div>

      <div className="content-body">
        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <p>{error}</p>
            <button onClick={fetchPastTournaments} className="retry-btn">
              Retry
            </button>
          </div>
        )}

        <div className="section">
          <h3>Past Tournaments</h3>
          {loading ? (
            <div className="loading-state">
              <p>Loading past tournaments...</p>
            </div>
          ) : pastTournaments.length > 0 ? (
            <div className="tournaments-list">
              {pastTournaments.map((tournament) => (
                <div 
                  key={tournament.id} 
                  className="tournament-row clickable"
                  onClick={() => handleTournamentClick(tournament)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="tournament-row-info">
                    <h4>{tournament.name}</h4>
                    <div className="tournament-meta-info">
                      <span className="game-badge">{getGameIcon(tournament.game)} {tournament.game === 'freeFire' ? 'Free Fire' : tournament.game === 'bgmi' ? 'BGMI' : 'Other'}</span>
                      <span className="created-date">{formatDate(tournament.created_at)}</span>
                    </div>
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

      {/* Tournament History Modal */}
      <TournamentHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={handleCloseHistoryModal}
        tournament={selectedTournament}
      />
    </div>
  )
}

export default HistoryContent

