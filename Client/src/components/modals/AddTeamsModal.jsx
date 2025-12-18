import React, { useState } from 'react'
import { extractTeamsFromText } from '../../lib/aiExtraction'
import { PenLine, Bot, Plus, X, Loader2, User } from 'lucide-react'
import AddMembersModal from './AddMembersModal'
import './AddTeamsModal.css'
import { useToast } from '../../context/ToastContext'
import { useSubscription } from '../../hooks/useSubscription';

const AddTeamsModal = ({ isOpen, onClose, onSubmit, tournamentName }) => {
  const [mode, setMode] = useState('manual') // 'manual' or 'ai'
  const [teams, setTeams] = useState([])
  const [currentTeam, setCurrentTeam] = useState('')
  const [aiText, setAiText] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const { features } = useSubscription();


  // Member addition state
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false)
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(null)

  const handleAddMembersClick = (index) => {
    setSelectedTeamIndex(index)
    setIsMembersModalOpen(true)
  }

  const handleSaveMembers = (members) => {
    const newTeams = [...teams]
    newTeams[selectedTeamIndex].members = members
    setTeams(newTeams)
  }

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
      try {
        addToast('warning', 'Please paste some text')
      } catch (e) {
        console.error('Toast failed:', e)
      }
      return
    }

    setLoading(true)
    try {
      console.log('🤖 Extracting teams using AI backend...')

      const extractedTeams = await extractTeamsFromText(aiText)

      if (!extractedTeams || extractedTeams.length === 0) {
        try {
          addToast('error', 'No teams could be extracted. Please check the format and try again.')
        } catch (e) {
          console.error('Toast failed:', e)
        }
        setLoading(false)
        return
      }

      console.log('✅ Extracted teams:', extractedTeams)
      setTeams(extractedTeams)
      setAiText('')
      try {
        addToast('success', `✅ Extracted ${extractedTeams.length} teams!`)
      } catch (e) {
        console.error('Toast failed:', e)
      }
    } catch (err) {
      console.error('❌ Error extracting teams:', err)
      try {
        addToast('error', `Error extracting teams: ${err.message || 'Please check your connection and try again.'}`)
      } catch (e) {
        console.error('Toast failed:', e)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (teams.length < 2) {
      try {
        addToast('warning', 'Please add at least 2 teams to create a tournament')
      } catch (e) {
        console.error('Toast failed:', e)
      }
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
            onClick={() => {
              if (features.canUseAI) {
                setMode('ai')
              } else {
                addToast('warning', 'AI Extraction is only available in Premium/Trial tiers.')
              }
            }}
            style={{ opacity: features.canUseAI ? 1 : 0.5, cursor: features.canUseAI ? 'pointer' : 'not-allowed' }}
          >
            <Bot size={16} /> AI Extract {!features.canUseAI && <span style={{ fontSize: '0.7em', marginLeft: '4px' }}>(Locked)</span>}
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
                      onClick={() => handleAddMembersClick(index)}
                      title="Add Members"
                      style={{ marginRight: '8px', color: team.members?.length > 0 ? '#646cff' : '#888' }}
                    >
                      <User size={16} />
                      {team.members?.length > 0 && <span style={{ marginLeft: '4px', fontSize: '0.8rem' }}>{team.members.length}</span>}
                    </button>
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

      <AddMembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        teamName={selectedTeamIndex !== null ? teams[selectedTeamIndex]?.name : ''}
        currentMembers={selectedTeamIndex !== null ? teams[selectedTeamIndex]?.members : []}
        onSave={handleSaveMembers}
      />
    </div>
  )
}

export default AddTeamsModal
