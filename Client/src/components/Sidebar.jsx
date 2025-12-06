import React from 'react'
import { LayoutDashboard, Trophy, User, Plus, X, LogOut, History } from 'lucide-react'
import './Sidebar.css'

function Sidebar({ activeTab, setActiveTab, onCreateClick, isOpen, onClose }) {
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
            <img src="/logo.jpg" alt="LazarFlow Logo" className="logo-img" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' }} />
            <h1>LazarFlow</h1>
          </div>
          <button className="close-sidebar-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <button className="create-button" onClick={() => {
          onCreateClick();
          if (window.innerWidth < 768) onClose();
        }}>
          <Plus size={20} />
          Create
        </button>

        <nav className="sidebar-nav">
          <button
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
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('profile');
              if (window.innerWidth < 768) onClose();
            }}
          >
            <User size={20} />
            <span className="nav-label">Profile</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('history');
              if (window.innerWidth < 768) onClose();
            }}
          >
            <History size={20} />
            <span className="nav-label">History</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
                        <div className="user-details">
              <span className="user-name">Praneeth</span>
              <span className="user-role">Admin</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
