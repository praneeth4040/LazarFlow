
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

        <div className="info-list">
          <div className="info-row">
            <div className="left">
              <span className="label">User ID</span>
            </div>
            <div className="right">
              <span className="value">{user?.id || "—"}</span>
            </div>
          </div>

          <hr />

          <div className="info-row">
            <div className="left">
              <span className="label">Email</span>
            </div>
            <div className="right">
              <span className="value">{user?.email || "—"}</span>
            </div>
          </div>

          <hr />
          <div className="info-row logout-row">
            <div className="left">
              <span className="label">⤴ Log out</span>
            </div>
            <div className="right">
              <button
                className="logout-btn"
                onClick={handleLogout}
                aria-label="Log out"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileContent;
