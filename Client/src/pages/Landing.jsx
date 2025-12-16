import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Settings, Smartphone, Shield, Zap, Download, Cloud } from 'lucide-react'
import SEO from '../components/SEO'
import { PAGE_SEO } from '../utils/seoConfig'
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
      {/* SEO Meta Tags */}
      <SEO
        title={PAGE_SEO.home.title}
        description={PAGE_SEO.home.description}
        keywords={PAGE_SEO.home.keywords}
        url="https://lazarflow.com/"
      />

      {/* Header/Navigation */}
      <header className="landing-header">
        <div className="header-container">
          <div className="logo">
            <div className="logo-text">LazarFlow</div>
          </div>
          <nav className="header-nav" aria-label="Main navigation">
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/signup" className="nav-link nav-link-primary">Sign Up</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-content">
          <div className="hero-badge">
            <Zap size={16} aria-hidden="true" />
            <span>Powered by AI</span>
          </div>
          <h1 id="hero-title" className="hero-title">
            Create Professional
            <span className="gradient-text"> Esports Tournament Points Tables & Leaderboards</span>
          </h1>
          <p className="hero-subtitle">
            The fastest way to create, customize, and share professional esports tournament points tables, live leaderboards, and standings. Perfect for PUBG, Valorant, CS2, and all competitive gaming tournaments. No design skills required.
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
      <section className="features" aria-labelledby="features-heading">
        <h2 id="features-heading" className="scroll-hidden">Why Choose LazarFlow for Your Esports Tournaments?</h2>
        <div className="features-grid">
          <article className="feature-card scroll-hidden" style={{ transitionDelay: '0ms' }}>
            <div className="feature-icon" aria-hidden="true">
              <Zap size={32} />
            </div>
            <h3>LexiView OCR Engine</h3>
            <p>Our new powerful AI engine extracts scoreboard data from screenshots with 99.9% accuracy. Say goodbye to manual entry.</p>
          </article>
          <article className="feature-card scroll-hidden" style={{ transitionDelay: '100ms' }}>
            <div className="feature-icon" aria-hidden="true">
              <Settings size={32} />
            </div>
            <h3>Custom Points Tables</h3>
            <p>Design your own points table layouts. Customize colors, fonts, and styles to match your brand identity perfectly.</p>
          </article>
          <article className="feature-card scroll-hidden" style={{ transitionDelay: '200ms' }}>
            <div className="feature-icon" aria-hidden="true">
              <Trophy size={32} />
            </div>
            <h3>Multi-Tournament Management</h3>
            <p>Manage multiple esports tournaments simultaneously. Track points, standings, and live leaderboards for all competition levels.</p>
          </article>
          <article className="feature-card scroll-hidden" style={{ transitionDelay: '300ms' }}>
            <div className="feature-icon" aria-hidden="true">
              <Smartphone size={32} />
            </div>
            <h3>Mobile-Optimized</h3>
            <p>Responsive tournament standings and points tables. Perfect viewing experience on mobile, tablet, and desktop devices.</p>
          </article>
          <article className="feature-card scroll-hidden" style={{ transitionDelay: '400ms' }}>
            <div className="feature-icon" aria-hidden="true">
              <Shield size={32} />
            </div>
            <h3>Secure Cloud Data</h3>
            <p>Enterprise-grade security and cloud storage for your esports tournament data, results, and team statistics.</p>
          </article>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works" aria-labelledby="how-it-works-heading">
        <div className="how-it-works-container">
          <h2 id="how-it-works-heading" className="scroll-hidden">How to Create Your Esports Points Table</h2>
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
      <section className="cta scroll-hidden" aria-labelledby="cta-heading">
        <div className="cta-content">
          <h2 id="cta-heading">Start Creating Tournament Leaderboards Today</h2>
          <p>Join thousands of esports organizers creating professional points tables and live standings with LazarFlow</p>
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
            <p>Free esports tournament points table maker, live leaderboards, and standings for competitive gaming</p>
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
