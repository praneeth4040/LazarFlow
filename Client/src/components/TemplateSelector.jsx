import React, { useState, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './TemplateSelector.css'

const TemplateSelector = ({ templates, selectedTemplate, onSelectTemplate }) => {
  const [filterTab, setFilterTab] = useState('all') // 'all', 'default', 'custom'
  const [currentIndex, setCurrentIndex] = useState(0)
  const carouselRef = useRef(null)

  // Filter templates based on tab
  const filteredTemplates = useMemo(() => {
    if (filterTab === 'all') return templates
    if (filterTab === 'default') {
      return templates.filter(t => t.template_type === 'default')
    }
    if (filterTab === 'custom') {
      return templates.filter(t => t.template_type === 'custom')
    }
    return templates
  }, [templates, filterTab])

  // Count by type
  const defaultCount = templates.filter(t => t.template_type === 'default').length
  const customCount = templates.filter(t => t.template_type === 'custom').length

  // Carousel navigation
  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredTemplates.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < filteredTemplates.length - 1 ? prev + 1 : 0))
  }

  const handleDotClick = (index) => {
    setCurrentIndex(index)
  }

  // Auto-select first template when filter changes
  useMemo(() => {
    setCurrentIndex(0)
    if (filteredTemplates.length > 0 && !selectedTemplate) {
      onSelectTemplate(filteredTemplates[0])
    }
  }, [filterTab])

  // Select current template
  const handleSelectCurrent = () => {
    if (filteredTemplates[currentIndex]) {
      onSelectTemplate(filteredTemplates[currentIndex])
    }
  }

  return (
    <div className="template-selector">
      {/* Header */}
      <div className="selector-header">
        <h3 className="selector-title">Select Template</h3>
      </div>

      {/* Filter Tabs */}
      {(defaultCount > 0 || customCount > 0) && (
        <div className="selector-tabs">
          <button
            className={`selector-tab ${filterTab === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            All ({templates.length})
          </button>
          {defaultCount > 0 && (
            <button
              className={`selector-tab ${filterTab === 'default' ? 'active' : ''}`}
              onClick={() => setFilterTab('default')}
            >
              LazarFlow ({defaultCount})
            </button>
          )}
          {customCount > 0 && (
            <button
              className={`selector-tab ${filterTab === 'custom' ? 'active' : ''}`}
              onClick={() => setFilterTab('custom')}
            >
              Custom ({customCount})
            </button>
          )}
        </div>
      )}

      {/* Carousel Slider */}
      {filteredTemplates.length > 0 ? (
        <div className="template-carousel">
          {/* Navigation Arrows */}
          {filteredTemplates.length > 1 && (
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
          <div className="carousel-track-container" ref={carouselRef}>
            <div
              className="carousel-track"
              style={{
                transform: `translateX(-${currentIndex * 100}%)`,
              }}
            >
              {filteredTemplates.map((template, index) => (
                <div
                  key={template.id}
                  className={`carousel-slide ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                  onClick={handleSelectCurrent}
                >
                  {/* Template Thumbnail */}
                  <div className="template-thumbnail">
                    {template.preview_image_url ? (
                      <img
                        src={template.preview_image_url}
                        alt={template.name}
                        className="thumbnail-image"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.parentElement.innerHTML = `
                            <div class="thumbnail-placeholder">
                              <span class="placeholder-icon">
                                ${template.design_format?.toUpperCase() || 'TEMPLATE'}
                              </span>
                            </div>
                          `
                        }}
                      />
                    ) : (
                      <div className="thumbnail-placeholder">
                        <span className="placeholder-icon">
                          {template.design_format?.toUpperCase() || 'TEMPLATE'}
                        </span>
                      </div>
                    )}

                    {/* Selection Indicator */}
                    {selectedTemplate?.id === template.id && (
                      <div className="selection-badge">
                        <span className="badge-icon">✓</span>
                      </div>
                    )}

                    {/* Type Badge */}
                    <div className={`type-badge ${template.template_type}`}>
                      {template.template_type === 'default' ? 'LAZARFLOW' : 'CUSTOM'}
                    </div>
                  </div>

                  {/* Template Info */}
                  <div className="template-info">
                    <h4 className="template-name">{template.name}</h4>
                    {template.description && (
                      <p className="template-description">{template.description}</p>
                    )}
                    <div className="template-meta">
                      <span className="meta-format">{template.design_format?.toUpperCase()}</span>
                      {template.placeholder_info && (
                        <span className="meta-placeholders">
                          {typeof template.placeholder_info === 'string'
                            ? JSON.parse(template.placeholder_info).length
                            : template.placeholder_info.length} placeholders
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Carousel Indicators (Dots) */}
          {filteredTemplates.length > 1 && (
            <div className="carousel-indicators">
              {filteredTemplates.map((_, index) => (
                <button
                  key={index}
                  className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => handleDotClick(index)}
                  aria-label={`Go to template ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Template Counter */}
          <div className="carousel-counter">
            {currentIndex + 1} / {filteredTemplates.length}
          </div>
        </div>
      ) : (
        <div className="empty-templates">
          <p className="empty-text">No templates available</p>
          <p className="empty-hint">Upload custom templates to get started</p>
        </div>
      )}
    </div>
  )
}

export default TemplateSelector
