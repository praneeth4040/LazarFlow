import React from 'react'
import { Link } from 'react-router-dom'
import './Landing.css'

function Landing() {
  return (
    <div className="landing">
      {/* Header/Navigation */}
      <header className="landing-header">
        <div className="header-container">
          <div className="logo">
            <h1>LazarFlow</h1>
          </div>
          <nav className="header-nav">
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/signup" className="nav-link nav-link-primary">Sign Up</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Esports Points Table Maker</h1>
          <p className="hero-subtitle">
            Create, manage, and visualize esports tournament leaderboards effortlessly
          </p>
          <div className="hero-buttons">
            <Link to="/signup" className="btn btn-primary">Get Started</Link>
            <Link to="/login" className="btn btn-secondary">Sign In</Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2>Why Choose LazarFlow?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">▲</div>
            <h3>Real-time Rankings</h3>
            <p>Instant leaderboard updates as matches progress</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">◆</div>
            <h3>Tournament Ready</h3>
            <p>Manage multiple tournaments simultaneously</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">◎</div>
            <h3>Fully Customizable</h3>
            <p>Configure scoring systems to your needs</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">▢</div>
            <h3>Mobile Friendly</h3>
            <p>Perfect viewing experience on all devices</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">♦</div>
            <h3>Secure & Reliable</h3>
            <p>Enterprise-grade security for your data</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">►</div>
            <h3>Lightning Fast</h3>
            <p>Optimized performance for seamless experience</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Sign Up</h3>
            <p>Create your free account in seconds</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Create Tournament</h3>
            <p>Set up your tournament and teams</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Manage Results</h3>
            <p>Update scores and watch rankings change</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Share & Celebrate</h3>
            <p>Share results with your community</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <h2>Ready to Get Started?</h2>
        <p>Join thousands of esports organizers using LazarFlow</p>
        <Link to="/signup" className="btn btn-primary btn-large">Create Your Account</Link>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>LazarFlow</h4>
            <p>Professional esports tournament management</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/signup">Sign Up</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Follow Us</h4>
            <p>Connect with us on social media</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 LazarFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
