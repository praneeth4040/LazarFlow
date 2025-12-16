import { LayoutDashboard, Trophy, User, Plus, X, History, AppWindow } from 'lucide-react'
import './Sidebar.css'

function Sidebar({ activeTab, setActiveTab, onCreateClick, onWhatsNewClick, isOpen, onClose, user }) {
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
            id="tour-layout-nav"
            className={`nav-item ${activeTab === 'layout' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('layout');
              if (window.innerWidth < 768) onClose();
            }}
          >
            <AppWindow size={20} />
            <span className="nav-label">Layout</span>
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
              setActiveTab('history');
              if (window.innerWidth < 768) onClose();
            }}
          >
            <History size={20} />
            <span className="nav-label">History</span>
          </button>

        </nav>

        <div className="sidebar-footer">
          <button
            className="whats-new-btn"
            onClick={() => {
              if (onWhatsNewClick) onWhatsNewClick();
              if (window.innerWidth < 768) onClose();
            }}
            style={{
              background: 'transparent',
              border: '1px dashed #e2e8f0',
              borderRadius: '8px',
              padding: '8px 12px',
              width: '100%',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '13px',
              marginBottom: '16px',
              cursor: 'pointer',
              marginBottom: '16px'
            }}
          >
            Hashtag WhatsNew ✨
          </button>

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
