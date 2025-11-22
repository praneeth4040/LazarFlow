import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Settings, Smartphone, Shield, Zap, Download, Cloud } from 'lucide-react'
import './Landing.css'

function Landing() {
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observerRef.current.unobserve(entry.target); // Only animate once
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    const hiddenElements = document.querySelectorAll('.scroll-hidden');
    hiddenElements.forEach((el) => observerRef.current.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

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
          <div className="hero-badge">
            <Zap size={16} />
            <span>Powered by AI</span>
          </div>
          <h1 className="hero-title">
            Build Stunning
            <span className="gradient-text"> Esports Leaderboards</span>
          </h1>
          <p className="hero-subtitle">
            The fastest way to create, customize, and share professional points tables for your tournaments. No design skills required.
          </p>
          <div className="hero-buttons">
            <Link to="/signup" className="btn btn-primary">
              <span>Start Free</span>
              <span className="btn-arrow">→</span>
            </Link>
            <Link to="/login" className="btn btn-secondary">
              <span>Sign In</span>
            </Link>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">100%</div>
              <div className="stat-label">Free to Use</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-icon">
                <Download size={28} />
              </div>
              <div className="stat-label">Instant Export</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-icon">
                <Cloud size={28} />
              </div>
              <div className="stat-label">Cloud Sync</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2 className="scroll-hidden">Why Choose LazarFlow?</h2>
        <div className="features-grid">
          <div className="feature-card scroll-hidden" style={{ transitionDelay: '0ms' }}>
            <div className="feature-icon">
              <Zap size={32} />
            </div>
            <h3>LazarEon</h3>
            <p>AI Agent for automatic points table making. Just upload a screenshot and let AI do the work.</p>
          </div>
          <div className="feature-card scroll-hidden" style={{ transitionDelay: '100ms' }}>
            <div className="feature-icon">
              <Trophy size={32} />
            </div>
            <h3>Tournament Ready</h3>
            <p>Manage multiple tournaments simultaneously with ease.</p>
          </div>
          <div className="feature-card scroll-hidden" style={{ transitionDelay: '200ms' }}>
            <div className="feature-icon">
              <Settings size={32} />
            </div>
            <h3>Fully Customizable</h3>
            <p>Configure scoring systems to your specific tournament rules.</p>
          </div>
          <div className="feature-card scroll-hidden" style={{ transitionDelay: '300ms' }}>
            <div className="feature-icon">
              <Smartphone size={32} />
            </div>
            <h3>Mobile Friendly</h3>
            <p>Perfect viewing experience on all devices, anywhere, anytime.</p>
          </div>
          <div className="feature-card scroll-hidden" style={{ transitionDelay: '400ms' }}>
            <div className="feature-icon">
              <Shield size={32} />
            </div>
            <h3>Secure & Reliable</h3>
            <p>Enterprise-grade security to keep your tournament data safe.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="how-it-works-container">
          <h2 className="scroll-hidden">How It Works</h2>
          <div className="steps">
            <div className="step scroll-hidden" style={{ transitionDelay: '0ms' }}>
              <div className="step-number">1</div>
              <h3>Sign Up</h3>
              <p>Create your free account in seconds</p>
            </div>
            <div className="step-arrow scroll-hidden" style={{ transitionDelay: '100ms' }}>→</div>
            <div className="step scroll-hidden" style={{ transitionDelay: '200ms' }}>
              <div className="step-number">2</div>
              <h3>Create Tournament</h3>
              <p>Set up your tournament and teams</p>
            </div>
            <div className="step-arrow scroll-hidden" style={{ transitionDelay: '300ms' }}>→</div>
            <div className="step scroll-hidden" style={{ transitionDelay: '400ms' }}>
              <div className="step-number">3</div>
              <h3>Manage Results</h3>
              <p>Update scores and watch rankings change</p>
            </div>
            <div className="step-arrow scroll-hidden" style={{ transitionDelay: '500ms' }}>→</div>
            <div className="step scroll-hidden" style={{ transitionDelay: '600ms' }}>
              <div className="step-number">4</div>
              <h3>Share & Celebrate</h3>
              <p>Share results with your community</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta scroll-hidden">
        <div className="cta-content">
          <h2>Ready to Get Started?</h2>
          <p>Join thousands of esports organizers using LazarFlow</p>
          <Link to="/signup" className="btn btn-primary btn-large">
            <span>Create Your Account</span>
            <span className="btn-arrow">→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>LazarFlow</h4>
            <p>Professional esports points table maker</p>
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
