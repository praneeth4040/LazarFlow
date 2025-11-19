import React from 'react'
import { Sparkles } from 'lucide-react'
import './TabContent.css'

function LazarEonContent() {
  return (
    <div className="tab-content">
      <div className="content-header">
        <h2> LazarEon</h2>
        <p>Intelligent tournament management powered by AI</p>
      </div>

      <div className="content-body">
        <div className="ai-section">
          <div className="ai-card">
            <div className="ai-icon"><Sparkles size={24} /></div>
            <h3>Auto Tournament Setup</h3>
            <p>Let AI automatically configure your tournament based on your requirements</p>
            <button className="feature-btn">Try Now</button>
          </div>

          <div className="ai-card">
            <div className="ai-icon">▲</div>
            <h3>Smart Scheduling</h3>
            <p>AI-powered match scheduling for optimal tournament flow</p>
            <button className="feature-btn">Try Now</button>
          </div>

          <div className="ai-card">
            <div className="ai-icon">●</div>
            <h3>Insights & Analytics</h3>
            <p>Get AI-generated insights about team performance and trends</p>
            <button className="feature-btn">Try Now</button>
          </div>

          <div className="ai-card">
            <div className="ai-icon">▢</div>
            <h3>Predictions</h3>
            <p>AI predictions for match outcomes and tournament winners</p>
            <button className="feature-btn">Try Now</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LazarEonContent
