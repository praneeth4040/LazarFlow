import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import './TeamDetailsModal.css'

const TeamDetailsModal = ({ isOpen, onClose, tournament, teams }) => {
  const [localTeams, setLocalTeams] = useState([])
  const [editingTeamId, setEditingTeamId] = useState(null)
  const [editingTeam, setEditingTeam] = useState(null)

  useEffect(() => {
    if (teams) {
      setLocalTeams(teams)
    }
  }, [teams])

  const handleEditClick = (team) => {
    setEditingTeamId(team.id)
    setEditingTeam({ ...team })
  }

  const handleSaveEdit = async (teamId) => {
    console.log('Saving team edit:', editingTeam)
    // TODO: Save to database
    setLocalTeams(
      localTeams.map(t => (t.id === teamId ? editingTeam : t))
    )
    setEditingTeamId(null)
    setEditingTeam(null)
  }

  const handleInputChange = (field, value) => {
    setEditingTeam({
      ...editingTeam,
      [field]: value
    })
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="team-details-container" onClick={(e) => e.stopPropagation()}>
        <div className="details-header">
          <div>
            <h2>Tournament Teams</h2>
            <p className="tournament-name">{tournament?.name}</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="details-body">
          {localTeams.length === 0 ? (
            <div className="no-teams">
              <p>No teams added yet</p>
            </div>
          ) : (
            <div className="teams-table">
              <div className="table-header">
                <div className="col-num">#</div>
                <div className="col-name">Team Name</div>
                <div className="col-points">Points</div>
                <div className="col-actions">Actions</div>
              </div>

              {localTeams.map((team, index) => (
                <div key={team.id} className="table-row">
                  {editingTeamId === team.id ? (
                    <>
                      <div className="col-num">{index + 1}</div>
                      <div className="col-name">
                        <input
                          type="text"
                          value={editingTeam.team_name}
                          onChange={(e) => handleInputChange('team_name', e.target.value)}
                          className="edit-input"
                        />
                      </div>
                      <div className="col-points">
                        {/* Display total points (read-only in this view) */}
                        {typeof editingTeam.total_points === 'object'
                          ? (editingTeam.total_points?.kill_points || 0) + (editingTeam.total_points?.placement_points || 0)
                          : (editingTeam.total_points || 0)}
                      </div>
                      <div className="col-actions">
                        <button
                          className="action-save"
                          onClick={() => handleSaveEdit(team.id)}
                        >
                          ✓ Save
                        </button>
                        <button
                          className="action-cancel"
                          onClick={() => setEditingTeamId(null)}
                        >
                          <X size={16} /> Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-num">{index + 1}</div>
                      <div className="col-name">{team.team_name}</div>
                      <div className="col-points">
                        {typeof team.total_points === 'object'
                          ? (team.total_points?.kill_points || 0) + (team.total_points?.placement_points || 0)
                          : (team.total_points || 0)}
                      </div>
                      <div className="col-actions">
                        <button
                          className="action-edit"
                          onClick={() => handleEditClick(team)}
                        >
                          ✎ Edit
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="details-footer">
          <p className="team-count">Total Teams: {localTeams.length}</p>
          <button className="btn-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default TeamDetailsModal
