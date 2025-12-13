import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Target, Sparkles, Camera, X, Upload } from 'lucide-react'
import { extractResultsFromScreenshot, fuzzyMatchName } from '../../lib/aiResultExtraction'
import { sendLiveUpdate } from '../../lib/liveSync'
import { useToast } from '../../context/ToastContext'
import { uploadGameResultImages } from '../../lib/imageStorage'
import RankMappingModal from './RankMappingModal'
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

  // AI extraction state
  const [aiScreenshot, setAiScreenshot] = useState(null)
  const [extractedData, setExtractedData] = useState(null)
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [pendingImageFiles, setPendingImageFiles] = useState([]) // Store image files until submission
  const { addToast } = useToast()

  useEffect(() => {
    if (isOpen && tournament) {
      fetchTeams()
    }
  }, [isOpen, tournament])

  useEffect(() => {
    if (teamSearch.trim()) {
      // Filter teams by search term AND exclude teams already added to results
      const addedTeamIds = results.map(r => r.team_id)
      setFilteredTeams(
        teams.filter(team =>
          team.team_name.toLowerCase().includes(teamSearch.toLowerCase()) &&
          !addedTeamIds.includes(team.id)
        )
      )
    } else {
      setFilteredTeams([])
    }
  }, [teamSearch, teams, results])

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
      try {
        addToast('error', 'Failed to fetch teams')
      } catch (e) {
        console.error('Toast failed:', e)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddResult = (team) => {
    const newResult = {
      team_id: team.id,
      team_name: team.team_name,
      position: null,
      kills: 0,
      placement_points: 0,
      kill_points: 0,
      total_points: 0, // Points for this specific match
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

  // AI Extraction Handlers
  const handleAIUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    try {
      setExtracting(true)
      // Use the first image as preview if needed, or just set a flag
      setAiScreenshot(files[0])

      // Extract data from screenshots
      const extracted = await extractResultsFromScreenshot(files)
      setExtractedData(extracted)

      // Store image files for later upload (on submit)
      setPendingImageFiles(files)
      console.log(`📦 Stored ${files.length} image(s) for upload on submission`)

      setShowMappingModal(true)
    } catch (error) {
      console.error('❌ AI extraction failed:', error)
      try {
        addToast('error', 'Failed to extract data from screenshot. Please try again.')
      } catch (e) {
        console.error('Toast failed:', e)
      }
    } finally {
      setExtracting(false)
    }
  }

  const handleSaveMapping = async (mappings, extractedRanks) => {
    try {
      setLoading(true)

      // DO NOT update database here - only prepare results for preview
      // Database will be updated in handleSubmit when user clicks "Submit Results"

      // Calculate results
      const calculatedResults = []
      for (const [rank, teamId] of Object.entries(mappings)) {
        const rankData = extractedRanks.find(r => r.rank === parseInt(rank))
        const team = teams.find(t => t.id === teamId)

        if (!rankData || !team) continue

        const placementPoints = tournament.points_system?.find(
          p => p.placement === rankData.rank
        )?.points || 0

        // Use total_eliminations if available, otherwise sum player kills
        const totalKills = rankData.total_eliminations !== undefined ? rankData.total_eliminations :
          (rankData.players.reduce((sum, p) => sum + (p.kills || 0), 0))

        const killPoints = totalKills * (tournament.kill_points || 1)

        calculatedResults.push({
          team_id: teamId,
          team_name: team.team_name,
          position: rankData.rank,
          kills: totalKills,
          placement_points: placementPoints,
          kill_points: killPoints,
          total_points: placementPoints + killPoints,
          players: rankData.players // Preserve player data for member stats update
        })
      }

      const uniqueResults = [...calculatedResults].sort((a, b) => a.position - b.position)
      setResults(uniqueResults)
      setShowMappingModal(false)

      console.log('✅ Mapping saved and results calculated')
    } catch (error) {
      console.error('❌ Error saving mapping:', error)
      try {
        addToast('error', 'Failed to save mapping. Please try again.')
      } catch (e) {
        console.error('Toast failed:', e)
      }
    } finally {
      setLoading(false)
    }
  }


  const handleSubmit = async () => {
    if (results.length === 0) {
      try {
        addToast('warning', 'Please add at least one team result');
      } catch (e) {
        console.error('Toast failed:', e);
      }
      return;
    }

    try {
      setLoading(true);
      console.log('📤 Submitting results:', results);

      

      // Update each team with their points and player stats
      for (const result of results) {
        const team = teams.find((t) => t.id === result.team_id);
        if (!team) continue;

        // Handle legacy data or default structure
        const currentStats =
          team && typeof team.total_points === 'object' && team.total_points
            ? team.total_points
            : { matches_played: 0, wins: 0, kill_points: 0, placement_points: 0 };

        const newStats = {
          matches_played: (currentStats.matches_played || 0) + 1,
          wins: (currentStats.wins || 0) + (parseInt(result.position) === 1 ? 1 : 0),
          kill_points: (currentStats.kill_points || 0) + (result.kill_points || 0),
          placement_points: (currentStats.placement_points || 0) + (result.placement_points || 0),
        };

        // Update individual player stats if we have player data from AI extraction
        let updatedMembers = (team.members || []).map(m => ({
          name: typeof m === 'object' && m !== null ? (m.name || '') : m,
          kills: typeof m === 'object' && m !== null ? (m.kills || 0) : 0,
          wwcd: typeof m === 'object' && m !== null ? (m.wwcd || 0) : 0,
          matches_played: typeof m === 'object' && m !== null ? (m.matches_played || 0) : 0,
        }))

        // Check if result has player-level data (from AI extraction via handleSaveMapping)
        if (result.players && Array.isArray(result.players) && result.players.length > 0) {
          // We have player data from AI extraction

          // If members array is empty or doesn't have proper structure, initialize it from AI data
          const seen = new Set()
          for (const player of result.players) {
            const pname = typeof player === 'object' && player !== null ? (player.name || '') : player
            const match = fuzzyMatchName(pname, updatedMembers, 0.8)
            if (match && match.member) {
              const idx = updatedMembers.findIndex(m => m.name === match.member.name)
              if (idx !== -1 && !seen.has(idx)) {
                updatedMembers[idx] = {
                  ...updatedMembers[idx],
                  kills: (updatedMembers[idx].kills || 0) + (player.kills || 0),
                  wwcd: (updatedMembers[idx].wwcd || 0) + (player.wwcd || 0),
                  matches_played: (updatedMembers[idx].matches_played || 0) + 1,
                }
                seen.add(idx)
              }
            } else {
              updatedMembers.push({
                name: pname,
                kills: player.kills || 0,
                wwcd: player.wwcd || 0,
                matches_played: 1,
              })
            }
          }
        } else {
          updatedMembers = (team.members || []).map((member) => ({
            name: member.name || member,
            kills: member.kills || 0,
            wwcd: member.wwcd || 0,
            matches_played: member.matches_played || 0,
          }));
        }

        const { error } = await supabase
          .from('tournament_teams')
          .update({
            total_points: newStats,
            members: updatedMembers,
          })
          .eq('id', result.team_id);

        if (error) throw error;
      }

      console.log('✅ Results submitted successfully');

      // Upload images to Supabase storage AFTER successful database update
      if (pendingImageFiles.length > 0) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.email) {
            console.log(`📤 Uploading ${pendingImageFiles.length} image(s) to Supabase storage...`);
            const imagePaths = await uploadGameResultImages(pendingImageFiles, user.email, tournament.name);
            console.log(`✅ Uploaded ${imagePaths.length} images to Supabase storage`);
            try {
              addToast('success', `Uploaded ${pendingImageFiles.length} image(s) to storage`);
            } catch (e) {
              console.error('Toast failed:', e);
            }
            // Clear pending images after successful upload
            setPendingImageFiles([]);
          }
        } catch (uploadError) {
          console.error('⚠️ Warning: Failed to upload images to storage:', uploadError);
          // Don't fail the entire operation if storage fails, just log it
          try {
            addToast('warning', 'Results saved but image upload failed');
          } catch (e) {
            console.error('Toast failed:', e);
          }
        }
      }

      alert(`✅ Results for ${results.length} team(s) saved!`);
      // Notify any open live pages for this tournament to refresh immediately
      if (tournament?.id) {
        sendLiveUpdate(tournament.id);
      }
      try {
        addToast('success', `✅ Results for ${results.length} team(s) saved!`);
      } catch (e) {
        console.error('Toast failed:', e);
      }
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setResults([]);
        setSubmitted(false);
      }, 1500);
    } catch (err) {
      console.error('❌ Error submitting results:', err);
      try {
        addToast('error', `Failed to submit results: ${err.message}`);
      } catch (e) {
        console.error('Toast failed:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !tournament) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container calculate-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Calculate Results - {tournament.name}</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Mode Selector */}
        <div className="mode-selector">
          <button
            className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            <Target size={16} /> Manual Entry
          </button>
          <button
            className={`mode-btn ${mode === 'ai' ? 'active' : ''}`}
            onClick={() => setMode('ai')}
          >
            <Sparkles size={16} /> AI Powered
          </button>
        </div>

        {/* Manual Mode */}
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
                      <X size={16} />
                    </button>
                  </div>
                  <img src={referenceImage} alt="Reference" className="reference-image" />
                </div>
              ) : (
                <div className="image-upload-placeholder">
                  <label htmlFor="image-upload" className="image-upload-label">
                    <div className="upload-icon"><Camera size={32} /></div>
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
                          <X size={16} />
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
                  {loading ? <span className="loader loader-small"></span> : 'Submit Results'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI Mode */}
        {mode === 'ai' && (
          <div className="modal-content">
            {!extractedData ? (
              <div className="ai-section">
                <div className="ai-upload-area">
                  <div className="upload-icon"><Upload size={48} /></div>
                  <h3>Upload Screenshot</h3>
                  <p>Take a screenshot of the Free Fire results screen</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="file-input"
                    onChange={handleAIUpload}
                    disabled={extracting}
                  />
                  {extracting && (
                    <div className="extracting-text">
                      <span className="loader loader-medium">Loading...</span>
                    </div>
                  )}
                </div>
                <div className="ai-info">
                  <p><strong>How it works:</strong></p>
                  <ul>
                    <li>Upload a screenshot of the match results</li>
                    <li>AI will extract ranks, players, and kills</li>
                    <li>First time: Map ranks to your teams</li>
                    <li>Future matches: Auto-detect teams!</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="ai-results-section">
                <div className="extraction-success">
                  <h3>✅ Extraction Complete!</h3>
                  <p>Detected {results.length} teams from screenshot</p>
                </div>

                <div className="results-section">
                  <h3>Match Results</h3>
                  {results.length > 0 ? (
                    <div className="results-list">
                      {results.map((result, idx) => (
                        <div key={idx} className="result-card">
                          <div className="result-card-header">
                            <div className="team-info">
                              <h4>{result.team_name}</h4>
                              <span className="result-index">Rank #{result.position}</span>
                            </div>
                          </div>
                          <div className="result-card-body">
                            <div className="result-row">
                              <div className="result-field readonly">
                                <label>Position</label>
                                <div className="value-display">{result.position}</div>
                              </div>
                              <div className="result-field readonly">
                                <label>Kills</label>
                                <div className="value-display">{result.kills}</div>
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
                      <p>No teams matched. Please try again or use manual entry.</p>
                    </div>
                  )}
                </div>

                {results.length > 0 && (
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => { setExtractedData(null); setResults([]); setAiScreenshot(null); setPendingImageFiles([]) }}
                      disabled={loading}
                    >
                      Upload Different Screenshot
                    </button>
                    <button
                      type="button"
                      className="btn-submit"
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? <span className="loader loader-small">Loading...</span> : 'Submit Results'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* Rank Mapping Modal */}
        <RankMappingModal
          isOpen={showMappingModal}
          extractedData={extractedData || []}
          teams={teams}
          onSave={handleSaveMapping}
          onCancel={() => setShowMappingModal(false)}
        />
      </div>
    </div>
  )
}

export default CalculateResultsModal
