import React from 'react'
import { LayoutDashboard, Trophy, User, Plus, X, History } from 'lucide-react'
import './Sidebar.css'

function Sidebar({ activeTab, setActiveTab, onCreateClick, isOpen, onClose, user }) {
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const displayInitial = displayName.charAt(0).toUpperCase()

  const tags = ["Esports Enthusiast", "Gaming Addict", "Esports Death Player", "Gaming God", "Esports Legend", "Gaming Master", "Esports Pro", "Gaming Pro", "Esports Ace", "Gaming Ace"];
  const randomTag = tags[Math.floor(Math.random() * tags.length)];
  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <img src="/logo.jpeg" alt="LazarFlow" className="logo-image" />
            <h1><span className="brand-blue">Lazar</span><span className="brand-black">Flow</span></h1>
          </div>
          <button className="close-sidebar-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <button id="tour-create-btn" className="create-button" onClick={() => {
          onCreateClick();
          if (window.innerWidth < 768) onClose();
        }}>
          <Plus size={20} />
          Create
        </button>

        <nav className="sidebar-nav">
          <button
            id="tour-home-nav"
            className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('home');
              if (window.innerWidth < 768) onClose();
            }}
          >
            <LayoutDashboard size={20} />
            <span className="nav-label">Home</span>
          </button>

          <button
            id="tour-lazareon-nav"
            className={`nav-item ${activeTab === 'lazareon' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('lazareon');
              if (window.innerWidth < 768) onClose();
            }}
          >
            <Trophy size={20} />
            <span className="nav-label">LazarEon</span>
          </button>

          <button
            id="tour-history-nav"
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('history');
              if (window.innerWidth < 768) onClose();
            }}
          >
            <History size={20} />
            <span className="nav-label">History</span>
          </button>

          <button
            id="tour-profile-nav"
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('profile');
              if (window.innerWidth < 768) onClose();
            }}
          >
            <User size={20} />
            <span className="nav-label">Profile</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{displayInitial}</div>
            <div className="user-details">
              <span className="user-name">{displayName}</span>
              <span className="user-role">{randomTag}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
