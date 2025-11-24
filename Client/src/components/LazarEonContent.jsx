import React from 'react'
import { Sparkles } from 'lucide-react'
import './TabContent.css'

function LazarEonContent() {
  return (
    <div className="tab-content">
      <div className="content-header">
        <h2>LazarEon</h2>
        <p>Intelligent tournament management powered by AI</p>
      </div>

      <div className="content-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="empty-state">
          <div className="empty-icon">
            <Sparkles size={64} style={{ color: '#646cff' }} />
          </div>
          <h2 style={{ fontSize: '2rem', marginTop: '20px', marginBottom: '10px' }}>Coming Soon</h2>
          <p style={{ fontSize: '1.1rem', color: '#888', maxWidth: '400px' }}>
            We are working hard to bring you the next generation of AI-powered tournament management. Stay tuned!
          </p>
        </div>
      </div>
    </div>
  )
}

export default LazarEonContent
