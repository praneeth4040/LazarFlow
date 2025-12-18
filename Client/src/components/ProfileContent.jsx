import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../hooks/useSubscription";
import { getUserThemes } from "../lib/dataService";
import "./TabContent.css";

function ProfileContent({ user = {}, onLogout }) {
  const navigate = useNavigate();
  const { tier, tournamentsCreated, loading, limits } = useSubscription();
  const [activeLayoutsCount, setActiveLayoutsCount] = useState(0);

  // Fetch active layouts count
  useEffect(() => {
    const fetchLayoutsCount = async () => {
      try {
        const themes = await getUserThemes();
        setActiveLayoutsCount(themes.length);
      } catch (error) {
        console.error('Error fetching layouts:', error);
        setActiveLayoutsCount(0);
      }
    };
    
    if (user?.id) {
      fetchLayoutsCount();
    }
  }, [user?.id]);

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

  // Helper function to get tier display name
  const getTierDisplayName = (tierName) => {
    // Check if user is in trial mode (free tier with < 2 tournaments)
    const isInTrial = tierName?.toLowerCase() === 'free' && tournamentsCreated < 2;
    
    const tierMap = {
      'free': isInTrial ? 'Free Trial' : 'Free Tier',
      'ranked': 'Ranked Tier',
      'competitive': 'Competitive Tier',
      'premier': 'Premier Tier',
      'developer': 'Developer Tier'
    };
    return tierMap[tierName?.toLowerCase()] || 'Free Tier';
  };

  // Check if user is in trial
  const isInTrial = () => {
    return tier?.toLowerCase() === 'free' && tournamentsCreated < 2;
  };

  // Helper function to get tier badge color
  const getTierColor = (tierName) => {
    const colorMap = {
      'free': { bg: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: 'rgba(99, 102, 241, 0.2)' },
      'ranked': { bg: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.2)' },
      'competitive': { bg: 'rgba(249, 115, 22, 0.1)', color: '#fb923c', border: 'rgba(249, 115, 22, 0.2)' },
      'premier': { bg: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.2)' },
      'developer': { bg: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: 'rgba(239, 68, 68, 0.2)' }
    };
    return colorMap[tierName?.toLowerCase()] || colorMap['free'];
  };

  // Get remaining tournaments for current tier
  const getRemainingTournaments = () => {
    if (tier === 'developer') return 'Unlimited';
    const remaining = limits.maxAILobbies - tournamentsCreated;
    return remaining > 0 ? remaining : 0;
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
            background: getTierColor(tier).bg,
            color: getTierColor(tier).color,
            padding: '4px 12px',
            borderRadius: '999px',
            fontWeight: 600,
            border: `1px solid ${getTierColor(tier).border}`
          }}>
            {getTierDisplayName(tier)}
          </span>
        </div>

        {/* Trial Notice Banner */}
        {isInTrial() && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '1.25rem' }}>✨</span>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#818cf8' }}>
                You're on Free Trial!
              </h3>
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', color: '#a3a3a3', lineHeight: '1.5' }}>
              Enjoying full features with <strong style={{ color: '#818cf8' }}>3 layouts</strong> and <strong style={{ color: '#818cf8' }}>custom social links</strong>.
              <br />
              Use {2 - tournamentsCreated} more AI tournament{2 - tournamentsCreated === 1 ? '' : 's'} to keep these perks!
            </p>
          </div>
        )}

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

          {/* Subscription Statistics */}
          <div className="info-group" style={{ margin: '1rem 0' }}>
            <div style={{ marginBottom: '0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#a3a3a3', textTransform: 'uppercase' }}>Subscription Stats</div>
            
            {/* Tournaments Created */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <span className="label" style={{ fontWeight: 600, fontSize: '0.95rem' }}>Tournaments Created</span>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '2px' }}>
                    {tier === 'developer' ? 'Unlimited available' : `${getRemainingTournaments()} remaining`}
                  </div>
                </div>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: getTierColor(tier).color
                }}>
                  {tournamentsCreated} / {limits.maxAILobbies === Infinity ? '∞' : limits.maxAILobbies}
                </span>
              </div>
              {/* Progress Bar */}
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '999px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: `${limits.maxAILobbies === Infinity ? 100 : Math.min((tournamentsCreated / limits.maxAILobbies) * 100, 100)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${getTierColor(tier).color}dd, ${getTierColor(tier).color})`,
                  borderRadius: '999px',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>

            {/* Active Layouts */}
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <span className="label" style={{ fontWeight: 600, fontSize: '0.95rem' }}>Active Layouts</span>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '2px' }}>
                    {tier === 'developer' ? 'Unlimited available' : `${limits.maxLayouts - activeLayoutsCount} slots remaining`}
                  </div>
                </div>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: getTierColor(tier).color
                }}>
                  {activeLayoutsCount} / {limits.maxLayouts === Infinity ? '∞' : limits.maxLayouts}
                </span>
              </div>
              {/* Progress Bar */}
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '999px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: `${limits.maxLayouts === Infinity ? 100 : Math.min((activeLayoutsCount / limits.maxLayouts) * 100, 100)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${getTierColor(tier).color}dd, ${getTierColor(tier).color})`,
                  borderRadius: '999px',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
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
