import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { subscribeToTournamentTeams } from '../../lib/realtime'
import PointsTable from '../PointsTable'
import { X } from 'lucide-react'
import './PointsTableModal.css'

const PointsTableModal = ({ isOpen, tournament, onClose }) => {
  const [teams, setTeams] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch teams on modal open and keep them in sync via realtime
  useEffect(() => {
    if (!isOpen || !tournament) return

    let unsubscribe = null

    const fetchTeams = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch tournament teams
        const { data: teamsData, error: teamsError } = await supabase
          .from('lobby_teams')
          .select('*')
          .eq('lobby_id', tournament.id)
          .order('created_at', { ascending: false })

        if (teamsError) throw teamsError

        setTeams(teamsData || [])
      } catch (err) {
        console.error('Error fetching teams:', err)
        setError(err.message || 'Failed to load teams')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTeams()

    // Subscribe to realtime changes for this tournament's teams
    unsubscribe = subscribeToTournamentTeams(tournament.id, () => {
      fetchTeams()
    })

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [isOpen, tournament])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container points-table-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Points Table - {tournament?.name}</h2>
          <button className="close-button" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Content */}
        <div className="modal-content points-table-content">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading standings...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
            </div>
          ) : (
            <PointsTable teams={teams} tournament={tournament} />
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="action-button secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PointsTableModal
