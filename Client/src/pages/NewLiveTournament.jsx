import React from 'react'
import { useParams } from 'react-router-dom'
import SEO from '../components/SEO'
import './NewLiveTournament.css'

// Hooks
import { useLiveTournament } from '../hooks/useLiveTournament'
import { useTournamentTheme } from '../hooks/useTournamentTheme'

// Components
import LiveHeader from '../components/live/LiveHeader'
import LiveTable from '../components/live/LiveTable'
import LiveFooter from '../components/live/LiveFooter'

const NewLiveTournament = ({ previewConfig }) => {
    const { liveid } = useParams()

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
                    title={`${tournament.name} - Live Standings`}
                    description={`Live standings for ${tournament.name}`}
                    url={window.location.href}
                />
            )}

            {/* Background Image Layer */}
            <div className="live-bg-layer"></div>

            <LiveHeader tournament={tournament} themeSource={themeSource} />

            <main className="live-content">
                <LiveTable teams={teams} />
            </main>

            <LiveFooter themeSource={themeSource} />
        </div>
    )
}

export default NewLiveTournament
