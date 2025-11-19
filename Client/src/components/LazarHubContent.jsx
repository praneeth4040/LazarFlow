import React from 'react'
import { Sparkles } from 'lucide-react'
import './TabContent.css'

function LazarHubContent() {
  const templates = [
    {
      id: 1,
      name: 'Esports League',
      description: 'Professional esports league template',
      icon: '▲',
    },
    {
      id: 2,
      name: 'Quick Tournament',
      description: 'Single-day tournament template',
      icon: <Sparkles size={20} />,
    },
    {
      id: 3,
      name: 'Round Robin',
      description: 'Round-robin tournament template',
      icon: '●',
    },
    {
      id: 4,
      name: 'Bracket Tournament',
      description: 'Single or double elimination bracket',
      icon: '▢',
    },
  ]

  return (
    <div className="tab-content">
      <div className="content-header">
        <h2>Lazar Hub</h2>
        <p>Browse and use pre-made tournament templates</p>
      </div>

      <div className="content-body">
        <div className="templates-grid">
          {templates.map((template) => (
            <div key={template.id} className="template-card">
              <div className="template-icon">{template.icon}</div>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
              <button className="use-template-btn">Use Template</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LazarHubContent
