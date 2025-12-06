import React, { useState } from 'react'
import { X, Globe, Lock, ExternalLink, Palette } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import './LiveTournamentModal.css'

const LiveTournamentModal = ({ isOpen, onClose, tournament }) => {
    const [copied, setCopied] = useState(false)
    const [visibility, setVisibility] = useState('public') // 'public' or 'private'
    const [selectedTheme, setSelectedTheme] = useState(tournament?.theme || 'default')
    const [showMvpList, setShowMvpList] = useState(true)
    const [isStarting, setIsStarting] = useState(false)

    if (!isOpen || !tournament) return null

    const liveLink = `${window.location.origin}/live/${tournament.id}`

    const themes = [
        { id: 'default', name: 'Default', color: '#0a1327', accent: '#0ea5e9' },
        { id: 'emerald', name: 'Emerald', color: '#022c22', accent: '#10b981' },
        { id: 'cyberpunk', name: 'Cyberpunk', color: '#1a0b2e', accent: '#d946ef' },
        { id: 'crimson', name: 'Crimson', color: '#2b0a0a', accent: '#ef4444' },
        { id: 'midnight', name: 'Midnight', color: '#000000', accent: '#ffffff' }
    ]

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(liveLink)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const handleStartLive = async () => {
        setIsStarting(true)
        try {
            // Update tournament theme in database (Skipped for now as per request)
            /*
            const { error } = await supabase
                .from('tournaments')
                .update({ theme: selectedTheme })
                .eq('id', tournament.id)

            if (error) {
                console.error('Error updating theme:', error)
            }
            */

            // Open with params
            const url = new URL(liveLink)
            // url.searchParams.set('theme', selectedTheme) // Disabled theme param
            if (!showMvpList) {
                url.searchParams.set('hideMvp', 'true')
            }
            window.open(url.toString(), '_blank')

            onClose()
        } catch (err) {
            console.error('Failed to start live:', err)
        } finally {
            setIsStarting(false)
        }
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
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    {/* MVP Toggle Section */}
                    <div className="form-group">
                        <div className="toggle-option" onClick={() => setShowMvpList(!showMvpList)}>
                            <div className="toggle-info">
                                <span className="toggle-title">Show MVP List</span>
                                <span className="toggle-desc">Display player performance stats</span>
                            </div>
                            <div className={`toggle-switch ${showMvpList ? 'active' : ''}`}>
                                <div className="toggle-knob"></div>
                            </div>
                        </div>
                    </div>

                    {/* Theme Selection (Disabled) */}
                    <div className="form-group disabled-group">
                        <label className="flex items-center gap-2">
                            <Palette size={16} /> Theme <span className="badge-soon">Coming Soon</span>
                        </label>
                        <div className="theme-options disabled">
                            {themes.map(theme => (
                                <div
                                    key={theme.id}
                                    className={`theme-option ${selectedTheme === theme.id ? 'selected' : ''}`}
                                    // onClick={() => setSelectedTheme(theme.id)} // Disabled interaction
                                    title={theme.name}
                                >
                                    <div
                                        className="theme-preview"
                                        style={{ backgroundColor: theme.color, borderColor: theme.accent }}
                                    >
                                        <div className="theme-accent-dot" style={{ backgroundColor: theme.accent }}></div>
                                    </div>
                                    <span className="theme-name">{theme.name}</span>
                                </div>
                            ))}
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
                    <button
                        className="submit-btn start-live-btn"
                        onClick={handleStartLive}
                        disabled={isStarting}
                    >
                        <span>{isStarting ? 'Starting...' : 'Start Live'}</span>
                        <ExternalLink size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LiveTournamentModal
