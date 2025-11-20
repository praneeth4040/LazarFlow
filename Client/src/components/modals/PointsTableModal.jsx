import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import TemplateRenderer from '../TemplateRenderer'
import { exportAsPNG, copyShareLink, generateShareLink } from '../../utils/exportHandler'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import './PointsTableModal.css'

const PointsTableModal = ({ isOpen, tournament, onClose }) => {
  const [teams, setTeams] = useState([])
  const [templates, setTemplates] = useState([])
  const [currentTemplateIndex, setCurrentTemplateIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

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
        setCurrentTemplateIndex(0)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err.message || 'Failed to load templates or teams')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [isOpen, tournament])

  // Carousel navigation
  const handlePrevious = () => {
    setCurrentTemplateIndex((prev) =>
      prev > 0 ? prev - 1 : templates.length - 1
    )
  }

  const handleNext = () => {
    setCurrentTemplateIndex((prev) =>
      prev < templates.length - 1 ? prev + 1 : 0
    )
  }

  const handleDotClick = (index) => {
    setCurrentTemplateIndex(index)
  }

  const currentTemplate = templates[currentTemplateIndex]

  const handleExportPNG = async () => {
    if (!currentTemplate) {
      setError('No template available')
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
      const shareUrl = generateShareLink(tournament.id, currentTemplate?.id)
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
          <button className="close-button" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Content */}
        <div className="modal-content points-table-content">
          <div className="render-section">
            {teams.length > 0 ? (
              <div className="templates-carousel">
                {/* Navigation Arrows */}
                {templates.length > 1 && (
                  <>
                    <button
                      className="carousel-arrow carousel-arrow-left"
                      onClick={handlePrevious}
                      aria-label="Previous template"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      className="carousel-arrow carousel-arrow-right"
                      onClick={handleNext}
                      aria-label="Next template"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}

                {/* Carousel Track */}
                <div className="carousel-track-container">
                  <div
                    className="carousel-track"
                    style={{
                      transform: `translateX(-${currentTemplateIndex * 100}%)`,
                    }}
                  >
                    {templates.map((template, index) => (
                      <div key={template.id} className="carousel-slide">
                        <TemplateRenderer
                          template={template}
                          tournament={tournament}
                          teams={teams}
                          isLoading={isLoading && index === currentTemplateIndex}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Carousel Indicators (Dots) */}
                {templates.length > 1 && (
                  <div className="carousel-indicators">
                    {templates.map((_, index) => (
                      <button
                        key={index}
                        className={`carousel-dot ${index === currentTemplateIndex ? 'active' : ''}`}
                        onClick={() => handleDotClick(index)}
                        aria-label={`Go to template ${index + 1}`}
                      />
                    ))}
                  </div>
                )}

                {/* Template Counter */}
                {templates.length > 1 && (
                  <div className="carousel-counter">
                    {currentTemplateIndex + 1} / {templates.length}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-message">
                <p>No teams added yet. Add teams to see standings.</p>
              </div>
            )}

            {/* Error Message */}
            {error && !error.includes('copied') && (
              <div className="error-banner">
                <span>{error}</span>
                <button onClick={() => setError(null)}><X size={16} /></button>
              </div>
            )}

            {error && error.includes('copied') && (
              <div className="success-banner">
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Actions */}
        {teams.length > 0 && (
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
              disabled={isLoading || !currentTemplate}
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
