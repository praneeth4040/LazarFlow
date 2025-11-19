import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './CalculateResultsModal.css'

function CalculateResultsModal({ isOpen, onClose, tournament }) {
  const [mode, setMode] = useState('manual') // 'manual' or 'ai'
  const [teams, setTeams] = useState([])
  const [results, setResults] = useState([])
  const [teamSearch, setTeamSearch] = useState('')
  const [filteredTeams, setFilteredTeams] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [referenceImage, setReferenceImage] = useState(null)

  useEffect(() => {
    if (isOpen && tournament) {
      fetchTeams()
    }
  }, [isOpen, tournament])

  useEffect(() => {
    if (teamSearch.trim()) {
      setFilteredTeams(
        teams.filter(team =>
          team.team_name.toLowerCase().includes(teamSearch.toLowerCase())
        )
      )
    } else {
      setFilteredTeams([])
    }
  }, [teamSearch, teams])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', tournament.id)

      if (error) throw error
      setTeams(data || [])
      console.log('✅ Teams fetched:', data)
    } catch (err) {
      console.error('❌ Error fetching teams:', err)
      alert('Failed to fetch teams')
    } finally {
      setLoading(false)
    }
  }

  const handleAddResult = (team) => {
    // Check if team already added
    if (results.some(r => r.team_id === team.id)) {
      alert('Team already added to results')
      return
    }

    const newResult = {
      team_id: team.id,
      team_name: team.team_name,
      position: null,
      kills: 0,
      placement_points: 0,
      kill_points: 0,
      total_points: 0,
    }

    setResults([...results, newResult])
    setTeamSearch('')
    setFilteredTeams([])
  }

  const handleUpdateResult = (index, field, value) => {
    const updatedResults = [...results]
    updatedResults[index][field] = field === 'kills' ? parseInt(value) || 0 : value

    // Calculate placement points based on points system
    if (field === 'position' && tournament.points_system) {
      const pointsEntry = tournament.points_system.find(
        p => p.placement === parseInt(value) || p.placement === value
      )
      updatedResults[index].placement_points = pointsEntry ? pointsEntry.points : 0
    }

    // Calculate kill points
    updatedResults[index].kill_points = updatedResults[index].kills * (tournament.kill_points || 0)

    // Calculate total
    updatedResults[index].total_points =
      updatedResults[index].placement_points + updatedResults[index].kill_points

    setResults(updatedResults)
  }

  const handleRemoveResult = (index) => {
    setResults(results.filter((_, i) => i !== index))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setReferenceImage(event.target?.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setReferenceImage(null)
  }

  const handleSubmit = async () => {
    if (results.length === 0) {
      alert('Please add at least one team result')
      return
    }

    try {
      setLoading(true)
      console.log('📤 Submitting results:', results)

      // Update each team with their points
      for (const result of results) {
        const { error } = await supabase
          .from('tournament_teams')
          .update({
            total_points: result.total_points,
          })
          .eq('id', result.team_id)

        if (error) throw error
      }

      console.log('✅ Results submitted successfully')
      alert(`✅ Results for ${results.length} team(s) saved!`)
      setSubmitted(true)
      setTimeout(() => {
        onClose()
        setResults([])
        setSubmitted(false)
      }, 1500)
    } catch (err) {
      console.error('❌ Error submitting results:', err)
      alert(`Failed to submit results: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !tournament) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container calculate-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Calculate Results - {tournament.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Mode Selector */}
        <div className="mode-selector">
          <button
            className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            🎯 Manual Entry
          </button>
          <button
            className={`mode-btn ${mode === 'ai' ? 'active' : ''}`}
            onClick={() => setMode('ai')}
          >
            ✨ AI Powered
          </button>
        </div>        {/* Manual Mode */}
        {mode === 'manual' && (
          <div className="modal-content">
            {/* Reference Image Section */}
            <div className="reference-image-section">
              {referenceImage ? (
                <div className="reference-image-container">
                  <div className="reference-image-header">
                    <h4>Reference Image</h4>
                    <button
                      className="clear-image-btn"
                      onClick={handleRemoveImage}
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                  <img src={referenceImage} alt="Reference" className="reference-image" />
                </div>
              ) : (
                <div className="image-upload-placeholder">
                  <label htmlFor="image-upload" className="image-upload-label">
                    <div className="upload-icon">📸</div>
                    <span>Upload screenshot for reference</span>
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="image-upload-input"
                  />
                </div>
              )}
            </div>

            {/* Team Search */}
            <div className="search-section">
              <label>Search & Add Teams</label>
              <div className="search-input-container">
                <input
                  type="text"
                  placeholder="Search team by name..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="search-input"
                />
                {filteredTeams.length > 0 && (
                  <div className="search-results">
                    {filteredTeams.map((team) => (
                      <div
                        key={team.id}
                        className="search-result-item"
                        onClick={() => handleAddResult(team)}
                      >
                        <span className="team-name">{team.team_name}</span>
                        <span className="add-icon">+</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Results Table */}
            <div className="results-section">
              <h3>Match Results</h3>
              {results.length > 0 ? (
                <div className="results-list">
                  {[...results].reverse().map((result, idx) => (
                    <div key={results.length - 1 - idx} className="result-card">
                      <div className="result-card-header">
                        <div className="team-info">
                          <h4>{result.team_name}</h4>
                          <span className="result-index">Result {idx + 1}</span>
                        </div>
                        <button
                          className="remove-btn"
                          onClick={() => handleRemoveResult(results.length - 1 - idx)}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="result-card-body">
                        <div className="result-row">
                          <div className="result-field">
                            <label>Position (1-60)</label>
                            <input
                              type="number"
                              min="1"
                              max="60"
                              placeholder="Enter position"
                              value={result.position || ''}
                              onChange={(e) => handleUpdateResult(results.length - 1 - idx, 'position', e.target.value)}
                              className="input-field"
                            />
                          </div>
                          <div className="result-field">
                            <label>Kills</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="Enter kills"
                              value={result.kills}
                              onChange={(e) => handleUpdateResult(results.length - 1 - idx, 'kills', e.target.value)}
                              className="input-field"
                            />
                          </div>
                        </div>

                        <div className="result-row">
                          <div className="result-field readonly">
                            <label>Placement Points</label>
                            <div className="value-display">{result.placement_points}</div>
                          </div>
                          <div className="result-field readonly">
                            <label>Kill Points</label>
                            <div className="value-display">{result.kill_points}</div>
                          </div>
                          <div className="result-field readonly highlight">
                            <label>Total Points</label>
                            <div className="value-display total">{result.total_points}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-results">
                  <p>No teams added yet. Search and add teams above.</p>
                </div>
              )}
            </div>

            {/* Form Actions */}
            {results.length > 0 && (
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Results'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI Mode */}
        {mode === 'ai' && (
          <div className="modal-content">
            <div className="ai-section">
              <div className="ai-upload-area">
                <div className="upload-icon">📸</div>
                <h3>Upload Screenshot</h3>
                <p>Take a screenshot of the results screen and upload it here</p>
                <input
                  type="file"
                  accept="image/*"
                  className="file-input"
                  disabled
                />
                <p className="coming-soon">Coming Soon</p>
              </div>
              <p className="ai-info">
                This feature will use AI to automatically detect team names, positions, and kills
                from the screenshot. Please use the manual entry method for now.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CalculateResultsModal
