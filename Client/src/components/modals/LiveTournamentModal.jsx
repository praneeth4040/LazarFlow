import React, { useState } from 'react'
import { X, Globe, Lock, ExternalLink } from 'lucide-react'
import './LiveTournamentModal.css'

import { getUserThemes, updateTournamentTheme, ensureTournamentPublicAndShareId } from '../../lib/dataService';
import { useToast } from '../../context/ToastContext';

const LiveTournamentModal = ({ isOpen, onClose, tournament }) => {
    const [copied, setCopied] = useState(false);
    const [visibility, setVisibility] = useState('public');
    const [selectedLayout, setSelectedLayout] = useState('single');
    const [showMvpList, setShowMvpList] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    const [themes, setThemes] = useState([]);
    const [selectedThemeIdx, setSelectedThemeIdx] = useState(0);
    const { addToast } = useToast();

    const liveLink = tournament
        ? `${window.location.origin}/live/${tournament.share_id || tournament.id}`
        : '';

    const layouts = [
        { id: 'single', name: 'Single (Points Table)' }
    ];

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(liveLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    React.useEffect(() => {
        const loadThemes = async () => {
            try {
                const arr = await getUserThemes();
                setThemes(arr);
                setSelectedThemeIdx(0);
            } catch (e) {
                console.error('Failed to load themes', e);
            }
        };
        if (isOpen) loadThemes();
    }, [isOpen]);

    const handleStartLive = async () => {
        setIsStarting(true);
        try {
            const themeToApply = themes[selectedThemeIdx] || null;
            if (themeToApply) {
                await updateTournamentTheme(tournament.id, themeToApply);
            }

            const pubTournament = await ensureTournamentPublicAndShareId(tournament.id, tournament.name);
            const url = new URL(`${window.location.origin}/live/${pubTournament.share_id}`);
            url.searchParams.set('layout', selectedLayout);
            if (!showMvpList) {
                url.searchParams.set('hideMvp', 'true');
            }
            window.open(url.toString(), '_blank');

            onClose();
            addToast('success', 'Live started with selected theme');
        } catch (err) {
            console.error('Failed to start live:', err);
            addToast('error', 'Failed to start live');
        } finally {
            setIsStarting(false);
        }
    };

    if (!isOpen || !tournament) return null;

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

                    {/* Layout Selection */}
                    <div className="form-group">
                        <label>Layout</label>
                        <div className="theme-options">
                            {layouts.map(layout => (
                                <div
                                    key={layout.id}
                                    className={`theme-option ${selectedLayout === layout.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedLayout(layout.id)}
                                    title={layout.name}
                                >
                                    <div className="theme-preview" style={{ backgroundColor: '#111827', borderColor: '#6b7280' }}>
                                        <div className="theme-accent-dot" style={{ backgroundColor: '#6b7280' }}></div>
                                    </div>
                                    <span className="theme-name">{layout.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Theme Selection */}
                    <div className="form-group">
                        <label>Theme</label>
                        <div className="theme-options">
                            {themes.map((t, idx) => {
                                const headerBG = t?.headerBackgroundColor || 'transparent';
                                const headerText = t?.headerTextColor || '#ffffff';
                                const footerBG = t?.footerBackgroundColor || '#000000';
                                const tableHeaderBG = t?.tableStyles?.header?.backgroundColor || '#1f2937';
                                const colRankBG = t?.tableStyles?.rank?.backgroundColor || 'transparent';
                                const colTeamBG = t?.tableStyles?.team?.backgroundColor || 'transparent';
                                const colWwcdBG = t?.tableStyles?.wwcd?.backgroundColor || 'transparent';
                                const colPlaceBG = t?.tableStyles?.place?.backgroundColor || 'transparent';
                                const colKillsBG = t?.tableStyles?.kills?.backgroundColor || 'transparent';
                                const colTotalBG = t?.tableStyles?.total?.backgroundColor || 'transparent';
                                const borderColor = t?.borderColor || '#6b7280';
                                const fontFamily = t?.fontFamily || 'Outfit, sans-serif';
                                return (
                                    <div
                                        key={idx}
                                        className={`theme-option ${selectedThemeIdx === idx ? 'selected' : ''}`}
                                        onClick={() => setSelectedThemeIdx(idx)}
                                        title={t?.name || `Theme ${idx + 1}`}
                                    >
                                        <div
                                            className="theme-preview"
                                            style={{
                                                borderColor,
                                                display: 'grid',
                                                gridTemplateRows: '10px 10px 10px 10px',
                                                gap: '2px',
                                                background: t?.backgroundColor || '#111827',
                                                fontFamily
                                            }}
                                        >
                                            <div style={{ background: headerBG }}></div>
                                            <div style={{ background: tableHeaderBG }}></div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '12px 28px 12px 12px 12px 12px', gap: '2px' }}>
                                                <div style={{ background: colRankBG }}></div>
                                                <div style={{ background: colTeamBG }}></div>
                                                <div style={{ background: colWwcdBG }}></div>
                                                <div style={{ background: colPlaceBG }}></div>
                                                <div style={{ background: colKillsBG }}></div>
                                                <div style={{ background: colTotalBG }}></div>
                                            </div>
                                            <div style={{ background: footerBG }}></div>
                                            <div
                                                className="theme-accent-dot"
                                                style={{ backgroundColor: headerText, position: 'absolute', right: 6, top: 6 }}
                                            ></div>
                                        </div>
                                        <span className="theme-name">{t?.name || `Theme ${idx + 1}`}</span>
                                    </div>
                                )
                            })}
                            {themes.length === 0 && (
                                <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>No saved themes</span>
                            )}
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
