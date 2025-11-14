import React from 'react'
import './Sidebar.css'

function Sidebar({ activeTab, setActiveTab, onCreateClick }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon">L</div>
          <h1>LazarFlow</h1>
        </div>
      </div>

      <button className="create-button" onClick={onCreateClick}>
        <span className="create-icon">+</span>
        Create
      </button>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span className="nav-icon">■</span>
          <span className="nav-label">Home</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'lazareon' ? 'active' : ''}`}
          onClick={() => setActiveTab('lazareon')}
        >
          <span className="nav-icon">◆</span>
          <span className="nav-label">LazarEon</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'hub' ? 'active' : ''}`}
          onClick={() => setActiveTab('hub')}
        >
          <span className="nav-icon">▲</span>
          <span className="nav-label">Lazar Hub</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span className="nav-icon">●</span>
          <span className="nav-label">Profile</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">P</div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
