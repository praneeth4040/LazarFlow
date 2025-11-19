import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import TemplateRenderer from '../TemplateRenderer'
import TemplateSelector from '../TemplateSelector'
import { exportAsPNG, copyShareLink, generateShareLink } from '../../utils/exportHandler'
import './PointsTableModal.css'

const PointsTableModal = ({ isOpen, tournament, onClose }) => {
  const [teams, setTeams] = useState([])
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('render') // 'render' or 'upload'

  // Fetch teams and templates on modal open
  useEffect(() => {
    if (!isOpen || !tournament) return

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch tournament teams
        const { data: teamsData, error: teamsError } = await supabase
          .from('tournament_teams')
          .select('*')
          .eq('tournament_id', tournament.id)
          .order('created_at', { ascending: false })

        if (teamsError) throw teamsError

        setTeams(teamsData || [])

        // Fetch available templates
        const { data: templatesData, error: templatesError } = await supabase
          .from('templates')
          .select('*')
          .order('created_at', { ascending: false })

        if (templatesError) throw templatesError

        setTemplates(templatesData || [])

        // Auto-select first template
        if (templatesData && templatesData.length > 0) {
          setSelectedTemplate(templatesData[0])
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err.message || 'Failed to load templates or teams')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [isOpen, tournament])

  const handleExportPNG = async () => {
    if (!selectedTemplate) {
      setError('Please select a template')
      return
    }

    try {
      setIsLoading(true)

      // Get renderer container
      const renderer = document.querySelector('.renderer-container')
      if (!renderer) {
        setError('Template preview not found')
        return
      }

      // Get the actual image/canvas element
      const element = renderer.querySelector('.renderer-svg, .renderer-canvas')
      if (!element) {
        setError('Template element not found')
        return
      }

      await exportAsPNG(element, `${tournament.name}-standings`)
      setError(null)
    } catch (err) {
      console.error('Export error:', err)
      setError(err.message || 'Failed to export image')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      const shareUrl = generateShareLink(tournament.id, selectedTemplate?.id)
      await copyShareLink(shareUrl)
      setError(null)

      // Show brief success message
      const prevError = error
      setError('Link copied to clipboard!')
      setTimeout(() => setError(prevError), 2000)
    } catch (err) {
      console.error('Copy link error:', err)
      setError(err.message || 'Failed to copy link')
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container points-table-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Points Table</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div className="modal-content points-table-content">
          {/* Tabs */}
          <div className="modal-tabs">
            <button
              className={`tab-button ${activeTab === 'render' ? 'active' : ''}`}
              onClick={() => setActiveTab('render')}
            >
              Preview
            </button>
            <button
              className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              Upload Template
            </button>
          </div>

          {/* Preview Tab */}
          {activeTab === 'render' && (
            <div className="render-section">
              {/* Template Selector */}
              {templates.length > 0 && (
                <div className="selector-wrapper">
                  <TemplateSelector
                    templates={templates}
                    selectedTemplate={selectedTemplate}
                    onSelectTemplate={setSelectedTemplate}
                  />
                </div>
              )}

              {/* Renderer */}
              {teams.length > 0 ? (
                <TemplateRenderer
                  template={selectedTemplate}
                  tournament={tournament}
                  teams={teams}
                  isLoading={isLoading}
                />
              ) : (
                <div className="empty-message">
                  <p>No teams added yet. Add teams to see standings.</p>
                </div>
              )}

              {/* Error Message */}
              {error && !error.includes('copied') && (
                <div className="error-banner">
                  <span>{error}</span>
                  <button onClick={() => setError(null)}>✕</button>
                </div>
              )}

              {error && error.includes('copied') && (
                <div className="success-banner">
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="upload-section">
              <p className="upload-notice">
                Upload custom SVG or PNG templates to be used across all tournaments.
              </p>
              {/* TemplateUploader will be imported here */}
              <div className="uploader-placeholder">
                TemplateUploader component will be rendered here
              </div>
            </div>
          )}
        </div>

        {/* Footer - Actions */}
        {activeTab === 'render' && teams.length > 0 && (
          <div className="modal-footer">
            <button
              className="action-button secondary"
              onClick={handleCopyLink}
              disabled={isLoading}
            >
              Share Link
            </button>
            <button
              className="action-button primary"
              onClick={handleExportPNG}
              disabled={isLoading || !selectedTemplate}
            >
              {isLoading ? 'Exporting...' : 'Export PNG'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default PointsTableModal
