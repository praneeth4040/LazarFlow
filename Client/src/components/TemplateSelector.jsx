import React, { useState, useMemo } from 'react'
import './TemplateSelector.css'

const TemplateSelector = ({ templates, selectedTemplate, onSelectTemplate }) => {
  const [filterTab, setFilterTab] = useState('all') // 'all', 'default', 'custom'

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

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="templates-grid">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
              onClick={() => onSelectTemplate(template)}
            >
              {/* Template Thumbnail */}
              <div className="template-thumbnail">
                {template.preview_image_url ? (
                  <img
                    src={template.preview_image_url}
                    alt={template.name}
                    className="thumbnail-image"
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
                  {template.template_type === 'default' ? 'LazarFlow' : 'Custom'}
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
