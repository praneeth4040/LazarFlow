import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import SEO from '../components/SEO'
import './NewLiveTournament.css'
import { Trophy, List } from 'lucide-react'

// Hooks
import { useLiveTournament } from '../hooks/useLiveTournament'
import { useTournamentTheme } from '../hooks/useTournamentTheme'

// Components
import LiveHeader from '../components/live/LiveHeader'
import LiveTable from '../components/live/LiveTable'
import LiveMVP from '../components/live/LiveMVP'
import LiveFooter from '../components/live/LiveFooter'

const NewLiveTournament = ({ previewConfig }) => {
    const { liveid } = useParams()
    const [view, setView] = useState('table') // 'table' | 'mvp'

    // 1. Data Logic
    const { tournament, teams, loading, error } = useLiveTournament(liveid, previewConfig)

    // 2. Theme Logic
    const { themeSource, customStyles } = useTournamentTheme(tournament, previewConfig)

    // 3. Render
    if (loading) return (
        <div className="live-container loading">
            <div className="loading-spinner"></div>
        </div>
    )

    if (error) return (
        <div className="live-container error">
            <p>{error}</p>
        </div>
    )

    return (
        <div className="live-layout" style={customStyles}>
            {tournament && (
                <SEO
                    title={`${tournament.name} - ${view === 'mvp' ? 'MVPs' : 'Live Standings'}`}
                    description={`Live standings and stats for ${tournament.name}`}
                    url={window.location.href}
                />
            )}

            {/* Background Image Layer */}
            <div className="live-bg-layer"></div>

            <LiveHeader tournament={tournament} themeSource={themeSource} />

            <div className="live-controls">
                <div className="view-toggle">
                    <button
                        className={`toggle-btn ${view === 'table' ? 'active' : ''}`}
                        onClick={() => setView('table')}
                    >
                        <List size={18} />
                        <span>Points Table</span>
                    </button>
                    <button
                        className={`toggle-btn ${view === 'mvp' ? 'active' : ''}`}
                        onClick={() => setView('mvp')}
                    >
                        <Trophy size={18} />
                        <span>MVPs</span>
                    </button>
                </div>
            </div>

            <main className="live-content">
                {view === 'table' ? (
                    <LiveTable teams={teams} />
                ) : (
                    <LiveMVP teams={teams} />
                )}
            </main>

            <LiveFooter themeSource={themeSource} />
        </div>
    )
}

export default NewLiveTournament
