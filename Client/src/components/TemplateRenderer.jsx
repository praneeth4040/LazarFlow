import React, { useEffect, useRef, useState } from 'react'
import {
  replaceSVGPlaceholders,
  replaceSVGTeamData,
  drawDataOnCanvas,
  formatTournamentData,
  calculateStandings
} from '../utils/templateHandler'
import './TemplateRenderer.css'

const TemplateRenderer = ({ template, tournament, teams, isLoading = false }) => {
  const [renderedContent, setRenderedContent] = useState(null)
  const [renderError, setRenderError] = useState(null)
  const [isRenderLoading, setIsRenderLoading] = useState(false)
  const canvasRef = useRef(null)

  // Render template with tournament data
  useEffect(() => {
    if (!template || !tournament || !teams || teams.length === 0) {
      setRenderedContent(null)
      return
    }

    const renderTemplate = async () => {
      try {
        setIsRenderLoading(true)
        setRenderError(null)

        // Calculate standings
        const standings = calculateStandings(teams)

        // Format tournament data
        const formattedData = formatTournamentData(tournament, standings)

        // Check if it's SVG or raster
        const isSVG = template.design_format?.toLowerCase() === 'svg'

        if (isSVG) {
          // Fetch SVG content
          const response = await fetch(template.design_url)
          if (!response.ok) throw new Error('Failed to fetch template')

          let svgContent = await response.text()

          // Replace placeholders
          svgContent = replaceSVGPlaceholders(svgContent, formattedData)

          // Replace team data in SVG
          svgContent = replaceSVGTeamData(svgContent, standings)

          // Create blob URL for inline display
          const blob = new Blob([svgContent], { type: 'image/svg+xml' })
          const blobUrl = URL.createObjectURL(blob)

          setRenderedContent({
            type: 'svg',
            url: blobUrl,
            rawSVG: svgContent
          })
        } else {
          // Raster format (PNG, JPG, etc) - render on canvas
          const response = await fetch(template.design_url)
          if (!response.ok) throw new Error('Failed to fetch template')

          const blob = await response.blob()
          const img = new Image()

          img.onload = () => {
            const canvas = canvasRef.current
            if (!canvas) return

            // Set canvas size to match image
            canvas.width = img.width
            canvas.height = img.height

            const ctx = canvas.getContext('2d')

            // Draw base image
            ctx.drawImage(img, 0, 0)

            // Draw data overlay
            drawDataOnCanvas(ctx, formattedData, {
              startY: img.height * 0.3,
              lineHeight: 40,
              fontSize: 18,
              fontFamily: 'Arial, sans-serif',
              textColor: '#ffffff',
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            })

            setRenderedContent({
              type: 'canvas',
              canvasRef: canvas
            })
          }

          img.onerror = () => {
            setRenderError('Failed to load template image')
          }

          img.src = URL.createObjectURL(blob)
        }
      } catch (error) {
        console.error('Template render error:', error)
        setRenderError(error.message || 'Failed to render template')
      } finally {
        setIsRenderLoading(false)
      }
    }

    renderTemplate()
  }, [template, tournament, teams])

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (renderedContent?.type === 'svg' && renderedContent?.url) {
        URL.revokeObjectURL(renderedContent.url)
      }
    }
  }, [renderedContent])

  if (isLoading || isRenderLoading) {
    return (
      <div className="template-renderer loading">
        <div className="loader">
          <div className="spinner"></div>
          <p>Rendering template...</p>
        </div>
      </div>
    )
  }

  if (renderError) {
    return (
      <div className="template-renderer error">
        <div className="error-box">
          <p className="error-title">⚠️ Render Error</p>
          <p className="error-message">{renderError}</p>
        </div>
      </div>
    )
  }

  if (!renderedContent) {
    return (
      <div className="template-renderer empty">
        <p>Select a template and tournament to preview</p>
      </div>
    )
  }

  return (
    <div className="template-renderer">
      <div className="renderer-container">
        {renderedContent.type === 'svg' ? (
          <img
            src={renderedContent.url}
            alt="Tournament standings"
            className="renderer-svg"
          />
        ) : (
          <canvas
            ref={canvasRef}
            className="renderer-canvas"
          />
        )}
      </div>

      <div className="renderer-info">
        <p className="template-name">{template.name}</p>
        <p className="template-format">
          {template.design_format?.toUpperCase()} Template
        </p>
      </div>
    </div>
  )
}

export default TemplateRenderer
