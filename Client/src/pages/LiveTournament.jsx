import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { subscribeToTournamentTeams } from '../lib/realtime'
import { subscribeToLiveUpdates } from '../lib/liveSync'
import { Trophy, AlertCircle, Download } from 'lucide-react'
import html2canvas from 'html2canvas'
import SEO from '../components/SEO'
import { PAGE_SEO, generateTournamentSchema } from '../utils/seoConfig'
import './LiveTournament.css'

const LiveTournament = () => {
    const { liveid } = useParams()
    const [tournament, setTournament] = useState(null)
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [downloading, setDownloading] = useState(false)
    const [expandedTeam, setExpandedTeam] = useState(null) // Track which team is expanded

    useEffect(() => {
        if (!liveid) return

        let unsubscribeRealtime = null
        let unsubscribeChannel = null
        let intervalId = null

        const init = async () => {
            console.log('🌐 LiveTournament init for id:', liveid)
            await fetchLiveData()

            // Subscribe to realtime changes for this tournament's teams (primary path)
            unsubscribeRealtime = subscribeToTournamentTeams(liveid, () => {
                console.log('🔔 Realtime change detected for live tournament teams, refetching...')
                fetchLiveData()
            })

            // Subscribe to local browser live updates (instant cross-tab updates)
            unsubscribeChannel = subscribeToLiveUpdates((message) => {
                if (message?.type === 'results-updated' && message.tournamentId === liveid) {
                    console.log('📣 Local live update received, refetching live data...')
                    fetchLiveData()
                }
            })

            // Fallback: lightweight polling every 30 seconds in case realtime is not configured
            intervalId = setInterval(() => {
                console.log('⏱️ Polling live tournament data as fallback (30s)...')
                fetchLiveData()
            }, 30000)
        }

        init()

        return () => {
            if (typeof unsubscribeRealtime === 'function') {
                unsubscribeRealtime()
            }
            if (typeof unsubscribeChannel === 'function') {
                unsubscribeChannel()
            }
            if (intervalId) {
                clearInterval(intervalId)
            }
        }
    }, [liveid])

    const fetchLiveData = async () => {
        try {
            setLoading(true)

            // 1. Fetch Tournament
            const { data: tournamentData, error: tournamentError } = await supabase
                .from('tournaments')
                .select('*')
                .eq('id', liveid)
                .single()

            if (tournamentError) throw tournamentError
            setTournament(tournamentData)

            // 2. Fetch Teams
            const { data: teamsData, error: teamsError } = await supabase
                .from('tournament_teams')
                .select('*')
                .eq('tournament_id', liveid)
                .order('total_points->kill_points', { ascending: false }) // Simple sort for now

            if (teamsError) throw teamsError

            // Calculate total points for sorting
            const processedTeams = (teamsData || []).map(team => {
                const points = typeof team.total_points === 'object'
                    ? team.total_points
                    : { kill_points: 0, placement_points: 0, matches_played: 0, wins: 0 }

                const total = (points.kill_points || 0) + (points.placement_points || 0)
                return { ...team, points, total }
            }).sort((a, b) => b.total - a.total)

            setTeams(processedTeams)

        } catch (err) {
            console.error('Error fetching live data:', err)
            setError('Tournament not found or is private.')
        } finally {
            setLoading(false)
        }
    }

    const handleDownloadImage = async () => {
        setDownloading(true)

        // Small delay to ensure browser has rendered everything
        await new Promise(resolve => setTimeout(resolve, 100))

        // Create a wrapper that includes header and content for download
        const wrapper = document.createElement('div')
        wrapper.style.cssText = `
            width: 1200px;
            background-color: #0f172a;
            padding: 2rem;
            font-family: 'Outfit', sans-serif;
        `

        // Clone header
        const header = document.querySelector('.live-header')
        const headerClone = header.cloneNode(true)
        headerClone.style.cssText = `
            background-color: #1e293b;
            padding: 1.5rem 2rem;
            border-bottom: 1px solid #334155;
            margin-bottom: 2rem;
            text-align: center;
        `

        // Center the header content and remove download button
        const headerInner = headerClone.querySelector('.header-inner')
        if (headerInner) {
            headerInner.style.cssText = 'justify-content: center; display: flex;'
        }

        const downloadBtn = headerClone.querySelector('.download-btn')
        if (downloadBtn) downloadBtn.remove()

        // Remove LIVE badge from download
        const liveBadge = headerClone.querySelector('.live-badge')
        if (liveBadge) liveBadge.remove()

        // Remove trophy icon for cleaner look
        const trophy = headerClone.querySelector('.trophy-icon')
        if (trophy) trophy.remove()

        wrapper.appendChild(headerClone)

        // Clone standings card
        const standingsCard = document.querySelector('.standings-card')
        const cardClone = standingsCard.cloneNode(true)
        cardClone.classList.add('force-desktop')

        // Remove data-labels
        const cells = cardClone.querySelectorAll('td')
        cells.forEach(cell => cell.removeAttribute('data-label'))

        wrapper.appendChild(cardClone)

        // Add LazarFlow branding footer
        const footer = document.createElement('div')
        footer.style.cssText = `
            text-align: center;
            padding: 1.5rem 2rem;
            margin-top: 2rem;
            color: #94a3b8;
            font-size: 0.875rem;
            border-top: 1px solid #334155;
        `
        footer.innerHTML = '<strong style="color: #38bdf8;">LazarFlow</strong> - Tournament Management System'
        wrapper.appendChild(footer)

        // Temporarily add to body (hidden)
        wrapper.style.position = 'absolute'
        wrapper.style.left = '-9999px'
        document.body.appendChild(wrapper)

        try {
            const canvas = await html2canvas(wrapper, {
                backgroundColor: '#0f172a',
                scale: 2,
                windowWidth: 1400,
                onclone: (clonedDoc) => {
                    // Inject CSS overrides to ensure proper display
                    const style = clonedDoc.createElement('style')
                    style.innerHTML = `
                        * { font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif !important; }
                        
                        h1 { 
                            color: #ffffff !important; 
                            font-size: 1.5rem !important;
                            font-weight: 700 !important;
                            margin: 0 !important;
                            background: transparent !important;
                            background-color: transparent !important;
                        }
                        
                        .live-header, .header-inner, .header-left {
                            background: transparent !important;
                            background-color: transparent !important;
                        }
                        
                        .standings-table { 
                            display: table !important; 
                            border-collapse: collapse !important;
                            width: 100% !important;
                        }
                        .standings-table thead { display: table-header-group !important; }
                        .standings-table tbody { display: table-row-group !important; }
                        .standings-table tr { 
                            display: table-row !important; 
                            margin-bottom: 0 !important; 
                            border: none !important; 
                            background-color: transparent !important; 
                        }
                        .standings-table td { 
                            display: table-cell !important; 
                            width: auto !important; 
                            text-align: center !important; 
                            padding: 1rem !important; 
                            border-bottom: 1px solid #334155 !important;
                            color: #cbd5e1 !important;
                        }
                        .standings-table td::before { display: none !important; }
                        .standings-table td.team-col { 
                            text-align: left !important; 
                            padding-left: 1rem !important;
                            color: white !important;
                            font-weight: 600 !important;
                        }
                        .standings-table td.rank-col { 
                            position: static !important;
                            font-weight: 500 !important;
                        }
                        .standings-table td.points-col {
                            color: #38bdf8 !important;
                            font-weight: 700 !important;
                            font-size: 1.1rem !important;
                        }
                        
                        /* Top 3 highlighting */
                        .top-1 td { background-color: rgba(251, 191, 36, 0.1) !important; }
                        .top-2 td { background-color: rgba(148, 163, 184, 0.1) !important; }
                        .top-3 td { background-color: rgba(180, 83, 9, 0.1) !important; }
                        
                        .top-1 .rank-number { color: #fbbf24 !important; }
                        .top-2 .rank-number { color: #e2e8f0 !important; }
                        .top-3 .rank-number { color: #b45309 !important; }
                    `
                    clonedDoc.head.appendChild(style)
                }
            })

            const image = canvas.toDataURL('image/png')
            const link = document.createElement('a')
            link.href = image
            link.download = `${tournament?.name || 'tournament'}-standings.png`
            link.click()
        } catch (error) {
            console.error('Error generating image:', error)
        } finally {
            // Clean up
            document.body.removeChild(wrapper)
            setDownloading(false)
        }
    }
    // Scaling logic removed - reverted to responsive layout

    if (loading) {
        return (
            <div className="live-container loading">
                <div className="spinner"></div>
                <p>Loading live standings...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="live-container error">
                <AlertCircle size={48} className="error-icon" />
                <h2>Unavailable</h2>
                <p>{error}</p>
            </div>
        )
    }

    return (
        <div className="live-container">
            {/* Dynamic SEO for Tournament */}
            {tournament && (
                <SEO
                    title={PAGE_SEO.liveTournament(tournament.name).title}
                    description={PAGE_SEO.liveTournament(tournament.name).description}
                    keywords={PAGE_SEO.liveTournament(tournament.name).keywords}
                    url={`https://lazarflow.com/live/${liveid}`}
                    structuredData={generateTournamentSchema(tournament, teams)}
                />
            )}

            <header className="live-header" role="banner">
                <div className="header-inner">
                    <div className="header-left">
                        <Trophy className="trophy-icon" size={32} aria-hidden="true" />
                        <h1>
                            {tournament?.name}
                            <span className="live-badge"> LIVE </span>
                        </h1>
                    </div>
                    <button
                        className="download-btn"
                        onClick={handleDownloadImage}
                        disabled={downloading}
                        title="Download Image"
                    >
                        <Download size={20} />
                        <span className="btn-text">{downloading ? 'Downloading...' : 'Download'}</span>
                    </button>
                </div>
            </header>

            <main className="live-content" role="main">
                <article className="standings-card" aria-labelledby="standings-heading">
                    <h2 id="standings-heading" className="sr-only">Tournament Standings</h2>
                    <table className="standings-table" role="table" aria-label="Live tournament leaderboard">
                        <thead>
                            <tr>
                                <th className="rank-col">#</th>
                                <th className="team-col">Team</th>
                                <th className="matches-col">M</th>
                                <th className="wins-col">WWCD</th>
                                <th className="place-col">Place Pts</th>
                                <th className="kills-col">Kills</th>
                                <th className="points-col">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map((team, index) => (
                                <React.Fragment key={team.id}>
                                    <tr className={index < 3 ? `top-${index + 1}` : ''}>
                                        <td className="rank-col" data-label="#">
                                            <span className="rank-number">{index + 1}</span>
                                        </td>
                                        <td
                                            className="team-col clickable"
                                            data-label="Team"
                                            onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {team.team_name}
                                            <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                                                {expandedTeam === team.id ? '▼' : '▶'}
                                            </span>
                                        </td>
                                        <td className="matches-col" data-label="M">{team.points.matches_played || 0}</td>
                                        <td className="wins-col" data-label="WWCD">{team.points.wins || 0}</td>
                                        <td className="place-col" data-label="Place">{team.points.placement_points || 0}</td>
                                        <td className="kills-col" data-label="Kills">{team.points.kill_points || 0}</td>
                                        <td className="points-col" data-label="Total">{team.total}</td>
                                    </tr>
                                    {expandedTeam === team.id && team.members && team.members.length > 0 && (
                                        <tr className="members-row">
                                            <td colSpan="7" className="members-cell">
                                                <div className="members-container">
                                                    <strong>Team Members Stats:</strong>
                                                    <table className="player-stats-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Player Name</th>
                                                                <th>M</th>
                                                                <th>Kills</th>
                                                                <th>WWCD</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {team.members.map((member, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="player-name">{member.name || member}</td>
                                                                    <td>{member.matches_played || 0}</td>
                                                                    <td>{member.kills || 0}</td>
                                                                    <td>{member.wwcd || 0}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </article>
            </main>
        </div>
    )
}

export default LiveTournament

