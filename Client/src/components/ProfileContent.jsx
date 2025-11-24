import React from 'react'
import { useNavigate } from 'react-router-dom'
import './TabContent.css'

function ProfileContent({ user, onLogout }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await onLogout()
    navigate('/login')
  }

  const extractInitials = (email) => {
    return email?.split('@')[0]?.charAt(0)?.toUpperCase() || 'U'
  }

  return (
    <div className="tab-content">
      <div className="content-header">
        <h2>Profile</h2>
        <p>Manage your account settings</p>
      </div>

      <div className="content-body">
        <div className="profile-section">
          <div className="profile-header">
            <div className="profile-avatar">{extractInitials(user?.email)}</div>
            <div className="profile-info">
              <h3>{user?.email?.split('@')[0]}</h3>
              <p>{user?.email}</p>
            </div>
          </div>

          <div className="profile-card">
            <h4>Account Information</h4>
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{user?.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">User ID:</span>
              <span className="info-value">{user?.id?.slice(0, 8)}...</span>
            </div>
            <div className="info-row">
              <span className="info-label">Joined:</span>
              <span className="info-value">{new Date(user?.created_at).toLocaleDateString()}</span>
            </div>
          </div>



          <div className="danger-zone">
            <h4>Danger Zone</h4>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileContent
