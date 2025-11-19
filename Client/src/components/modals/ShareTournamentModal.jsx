import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import './ShareTournamentModal.css'

function ShareTournamentModal({ isOpen, onClose, tournament }) {
  const [copied, setCopied] = useState(null)

  // Generate unique tournament code (first 8 chars of ID + tournament name first 3 chars)
  const tournamentCode = tournament?.id?.substring(0, 8).toUpperCase() || 'N/A'
  const shareUrl = `${window.location.origin} /tournament/${tournament?.id} ` || ''

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied('link')
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      alert('Failed to copy link')
    }
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(tournamentCode)
      setCopied('code')
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      alert('Failed to copy code')
    }
  }

  const handleShareWhatsApp = () => {
    const message = `Check out my tournament "${tournament?.name}"! Join using code: ${tournamentCode}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleShareEmail = () => {
    const subject = `Join my tournament: ${tournament?.name}`
    const body = `Hi! I've created a tournament called "${tournament?.name}". Join using this link or code: ${tournamentCode}\n\n${shareUrl}`
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl)
  }

  const handleShareTwitter = () => {
    const text = `Check out my tournament "${tournament?.name}"! Code: ${tournamentCode}`
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(twitterUrl, '_blank')
  }

  if (!isOpen || !tournament) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-header">
          <h2>Share Tournament</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="share-content">
          <div className="share-title">{tournament.name}</div>

          {/* Copy Code */}
          <div className="share-item">
            <label>Tournament Code</label>
            <div className="input-with-btn">
              <input type="text" value={tournamentCode} readOnly />
              <button
                className={`copy-btn ${copied === 'code' ? 'copied' : ''}`}
                onClick={handleCopyCode}
              >
                {copied === 'code' ? '✓' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Copy Link */}
          <div className="share-item">
            <label>Share Link</label>
            <div className="input-with-btn">
              <input type="text" value={shareUrl} readOnly />
              <button
                className={`copy-btn ${copied === 'link' ? 'copied' : ''}`}
                onClick={handleCopyLink}
              >
                {copied === 'link' ? '✓' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Social Buttons */}
          <div className="social-buttons">
            <button className="social-btn whatsapp" onClick={handleShareWhatsApp} title="Share on WhatsApp">
              💬 WhatsApp
            </button>
            <button className="social-btn email" onClick={handleShareEmail} title="Share via Email">
              📧 Email
            </button>
            <button className="social-btn twitter" onClick={handleShareTwitter} title="Share on Twitter">
              𝕏 Twitter
            </button>
          </div>
        </div>

        <div className="share-footer">
          <button className="btn-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default ShareTournamentModal
