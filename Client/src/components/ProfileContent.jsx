import React from "react";
import { useNavigate } from "react-router-dom";
import "./TabContent.css";

function ProfileContent({ user = {}, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await onLogout?.();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      navigate("/login");
    }
  };

  const initials = (email) =>
    email?.split?.("@")?.[0]?.charAt(0)?.toUpperCase() || "U";

  const displayName = user?.email?.split?.("@")?.[0] || "User";

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="profile-card-wrap">
      <div className="profile-header-hero">
        <div className="hero-gradient" />
        <div className="avatar-circle">
          <img
            alt={displayName}
            src={user?.photoURL || ""}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="avatar-initials">{initials(user?.email)}</div>
        </div>
      </div>

      <div className="profile-main">
        <h1 className="profile-name">{displayName}</h1>
        <div className="profile-meta" style={{ textAlign: 'center', marginBottom: '1.5rem', opacity: 0.7, fontSize: '0.9rem' }}>
          <span className="plan-badge" style={{
            background: 'rgba(99, 102, 241, 0.1)',
            color: '#818cf8',
            padding: '4px 12px',
            borderRadius: '999px',
            fontWeight: 600,
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}>
            Free Tier
          </span>
        </div>

        <div className="info-list">
          {/* Account Details */}
          <div className="info-row">
            <div className="left"><span className="label">User ID</span></div>
            <div className="right"><span className="value">{user?.id || "—"}</span></div>
          </div>
          <div className="info-row">
            <div className="left"><span className="label">Email</span></div>
            <div className="right"><span className="value">{user?.email || "—"}</span></div>
          </div>
          <div className="info-row">
            <div className="left"><span className="label">Member Since</span></div>
            <div className="right"><span className="value">{formatDate(user?.created_at)}</span></div>
          </div>
          <div className="info-row">
            <div className="left"><span className="label">Last Login</span></div>
            <div className="right"><span className="value">{formatDate(user?.last_sign_in_at)}</span></div>
          </div>

          <hr />

          {/* Partnership Program */}
          <div className="info-group" style={{ margin: '1rem 0' }}>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#a3a3a3', textTransform: 'uppercase' }}>Partnership</div>
            <div className="info-row">
              <div className="left">
                <span className="label">Become a Partner</span>
                <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '2px' }}>Collaborate effectively with LazarFlow</div>
              </div>
              <div className="right">
                <a
                  href="mailto:praneethchakka23@gmail.com?subject=LazarFlow%20Partnership%20Request"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 16px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    transition: 'all 0.2s'
                  }}
                >
                  Request Collaboration
                </a>
              </div>
            </div>
          </div>

          <hr />

          <div className="info-row logout-row">
            <div className="left"><span className="label">⤴ Log out</span></div>
            <div className="right">
              <button className="logout-btn" onClick={handleLogout} aria-label="Log out">Log out</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileContent;
