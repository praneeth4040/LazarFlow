import React, { useState } from 'react'
import { extractTeamsFromText, extractTeamsLocally } from '../../lib/aiExtraction'
import { PenLine, Bot, Plus, X, Loader2 } from 'lucide-react'
import './AddTeamsModal.css'

const AddTeamsModal = ({ isOpen, onClose, onSubmit, tournamentName }) => {
  const [mode, setMode] = useState('manual') // 'manual' or 'ai'
  const [teams, setTeams] = useState([])
  const [currentTeam, setCurrentTeam] = useState('')
  const [aiText, setAiText] = useState('')
  const [loading, setLoading] = useState(false)

  // Manual mode: Add single team
  const handleAddTeam = () => {
    if (currentTeam.trim()) {
      setTeams([...teams, { name: currentTeam.trim() }])
      setCurrentTeam('')
    }
  }

  // Manual mode: Remove team
  const handleRemoveTeam = (index) => {
    setTeams(teams.filter((_, i) => i !== index))
  }

  // AI mode: Extract teams from text
  const handleExtractTeams = async () => {
    if (!aiText.trim()) {
      alert('Please paste some text')
      return
    }

    setLoading(true)
    try {
      console.log('🤖 Extracting teams from AI mode...')

      // Try API first
      let extractedTeams = await extractTeamsFromText(aiText)

      // Fallback to local extraction if API fails
      if (!extractedTeams) {
        console.log('⚙️ Using fallback local extraction...')
        extractedTeams = extractTeamsLocally(aiText)
      }

      if (!extractedTeams || extractedTeams.length === 0) {
        alert('No teams could be extracted. Please check the format and try again.')
        setLoading(false)
        return
      }

      console.log('✅ Extracted teams:', extractedTeams)
      setTeams(extractedTeams)
      setAiText('')
      alert(`✅ Extracted ${extractedTeams.length} teams!`)
    } catch (err) {
      console.error('Error extracting teams:', err)
      alert('Error extracting teams. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (teams.length === 0) {
      alert('Please add at least one team')
      return
    }

    console.log('Submitting teams:', teams)
    onSubmit(teams)
    setTeams([])
    setCurrentTeam('')
    setAiText('')
    setMode('manual')
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Teams to "{tournamentName}"</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Mode Selector */}
        <div className="mode-selector">
          <button
            className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            <PenLine size={16} /> Manual Entry
          </button>
          <button
            className={`mode-btn ${mode === 'ai' ? 'active' : ''}`}
            onClick={() => setMode('ai')}
          >
            <Bot size={16} /> AI Extract
          </button>
        </div>

        <div className="modal-body">
          {mode === 'manual' ? (
            <div className="manual-mode">
              <div className="input-group">
                <input
                  type="text"
                  value={currentTeam}
                  onChange={(e) => setCurrentTeam(e.target.value)}
                  placeholder="Enter team name"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTeam()
                    }
                  }}
                />
                <button className="add-btn" onClick={handleAddTeam}>
                  <Plus size={16} /> Add
                </button>
              </div>
              <p className="hint">Press Enter or click Add to add a team</p>
            </div>
          ) : (
            <div className="ai-mode">
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder="Paste tournament details or WhatsApp message here...&#10;The AI will extract team names automatically!"
                className="ai-textarea"
              />
              <button
                className="extract-btn"
                onClick={handleExtractTeams}
                disabled={loading}
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Extracting...</> : <><Bot size={16} /> Extract Teams</>}
              </button>
              <p className="hint">
                Paste any text with team names and the AI will extract them.
              </p>
            </div>
          )}

          {/* Teams List */}
          <div className="teams-list">
            <h3>Teams ({teams.length})</h3>
            {teams.length === 0 ? (
              <p className="empty-teams">No teams added yet</p>
            ) : (
              <div className="teams-grid">
                {teams.map((team, index) => (
                  <div key={index} className="team-card">
                    <span className="team-name">
                      {index + 1}. {team.name}
                    </span>
                    <button
                      className="remove-btn"
                      onClick={() => handleRemoveTeam(index)}
                      title="Remove team"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={teams.length === 0}
          >
            Add {teams.length} Team{teams.length !== 1 ? 's' : ''} ✓
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddTeamsModal
