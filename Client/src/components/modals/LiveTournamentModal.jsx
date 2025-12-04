import React, { useState } from 'react'
import { X, Copy, Check, Globe, Lock, ExternalLink } from 'lucide-react'
import './LiveTournamentModal.css'

const LiveTournamentModal = ({ isOpen, onClose, tournament }) => {
    const [copied, setCopied] = useState(false)
    const [visibility, setVisibility] = useState('public') // 'public' or 'private'

    if (!isOpen || !tournament) return null

    const liveLink = `${window.location.origin}/live/${tournament.id}`

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(liveLink)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const handleStartLive = () => {
        window.open(liveLink, '_blank')
        onClose()
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content live-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Go Live</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <p className="modal-description">
                        Share the live standings of <strong>{tournament.name}</strong> with your audience.
                    </p>

                    {/* Link Section */}
                    <div className="form-group">
                        <label>Live Link</label>
                        <div className="input-with-btn">
                            <input type="text" value={liveLink} readOnly />
                            <button
                                className={`copy-btn ${copied ? 'copied' : ''}`}
                                onClick={handleCopyLink}
                            >
                                {copied ? <Check size={28} /> : <Copy size={28} />}
                            </button>
                        </div>
                    </div>

                    {/* Visibility Section */}
                    <div className="form-group">
                        <label>Visibility</label>
                        <div className="visibility-options">
                            <div
                                className={`visibility-option ${visibility === 'public' ? 'selected' : ''}`}
                                onClick={() => setVisibility('public')}
                            >
                                <div className="vis-icon">
                                    <Globe size={24} />
                                </div>
                                <div className="vis-info">
                                    <span className="vis-title">Public</span>
                                    <span className="vis-desc">Anyone with the link can view</span>
                                </div>
                                <div className="vis-check">
                                    <div className="radio-circle"></div>
                                </div>
                            </div>

                            <div className="visibility-option disabled">
                                <div className="vis-icon">
                                    <Lock size={24} />
                                </div>
                                <div className="vis-info">
                                    <span className="vis-title">Private <span className="badge-soon">Soon</span></span>
                                    <span className="vis-desc">Only approved users can view</span>
                                </div>
                                <div className="vis-check">
                                    <div className="radio-circle"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                    <button className="submit-btn start-live-btn" onClick={handleStartLive}>
                        <span>Start Live</span>
                        <ExternalLink size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LiveTournamentModal
