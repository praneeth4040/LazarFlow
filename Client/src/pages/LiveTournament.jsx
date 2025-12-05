import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { subscribeToTournamentTeams } from '../lib/realtime'
import { subscribeToLiveUpdates } from '../lib/liveSync'
import { Trophy, AlertCircle, Download, Award } from 'lucide-react'
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
    const [showMVPs, setShowMVPs] = useState(false) // Toggle between standings and MVPs
    const [mvps, setMvps] = useState([]) // Store calculated MVPs

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10) // Show 10 items per page

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

            // Calculate MVPs from teams
            const allPlayers = []
            processedTeams.forEach(team => {
                if (team.members && Array.isArray(team.members)) {
                    team.members.forEach(member => {
                        const playerName = member.name || member
                        if (playerName) {
                            const existingPlayer = allPlayers.find(p =>
                                p.name.toLowerCase().trim() === playerName.toLowerCase().trim()
                            )

                            if (existingPlayer) {
                                existingPlayer.matches_played += (member.matches_played || 0)
                                existingPlayer.kills += (member.kills || 0)
                                existingPlayer.wwcd += (member.wwcd || 0)
                                existingPlayer.teams.push(team.team_name)
                            } else {
                                allPlayers.push({
                                    name: playerName,
                                    matches_played: member.matches_played || 0,
                                    kills: member.kills || 0,
                                    wwcd: member.wwcd || 0,
                                    teams: [team.team_name]
                                })
                            }
                        }
                    })
                }
            })

            // Sort by kills, then WWCD, then matches
            const sortedMVPs = allPlayers.sort((a, b) => {
                if (b.kills !== a.kills) return b.kills - a.kills
                if (b.wwcd !== a.wwcd) return b.wwcd - a.wwcd
                return b.matches_played - a.matches_played
            }).map((player, index) => ({
                ...player,
                rank: index + 1,
                avgKills: player.matches_played > 0
                    ? (player.kills / player.matches_played).toFixed(2)
                    : '0.00'
            }))

            setMvps(sortedMVPs)

        } catch (err) {
            console.error('Error fetching live data:', err)
            setError('Tournament not found or is private.')
        } finally {
            setLoading(false)
        }
    }

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentMvps = mvps.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(mvps.length / itemsPerPage)

    const paginate = (pageNumber) => setCurrentPage(pageNumber)

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

        // Remove all buttons from the header (Standings, MVPs, Download)
        const buttons = headerClone.querySelectorAll('button')
        buttons.forEach(btn => btn.remove())

        // Remove LIVE badge from download
        const liveBadge = headerClone.querySelector('.live-badge')
        if (liveBadge) liveBadge.remove()

        // Remove trophy icon for cleaner look
        const trophy = headerClone.querySelector('.trophy-icon')
        if (trophy) trophy.remove()

        wrapper.appendChild(headerClone)

        // Clone visible card (Standings or MVPs)
        const standingsCard = document.querySelector('.standings-card')
        const mvpsCard = document.querySelector('.mvps-card')
        const isMvpsActive = showMVPs

        // For MVPs, we need to generate a full table from data, not just clone the DOM (which is paginated)
        if (isMvpsActive) {
            const mvpsContainer = document.createElement('div')
            mvpsContainer.className = 'mvps-card force-desktop'
            mvpsContainer.innerHTML = `
                <table class="mvps-table">
                    <thead>
                        <tr>
                            <th class="rank-col">#</th>
                            <th class="player-col">Player</th>
                            <th class="team-col">Team(s)</th>
                            <th class="matches-col">M</th>
                            <th class="kills-col">Kills</th>
                            <th class="avg-col">Avg</th>
                            <th class="wwcd-col">WWCD</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mvps.map((player, index) => `
                            <tr class="${index < 3 ? `top-${index + 1}` : ''}">
                                <td class="rank-col"><span class="rank-number">${player.rank}</span></td>
                                <td class="player-col"><strong>${player.name}</strong></td>
                                <td class="team-col">
                                    <span class="team-badges">
                                        ${player.teams.map(team => `<span class="team-badge">${team}</span>`).join('')}
                                    </span>
                                </td>
                                <td class="matches-col">${player.matches_played}</td>
                                <td class="kills-col"><strong>${player.kills}</strong></td>
                                <td class="avg-col">${player.avgKills}</td>
                                <td class="wwcd-col">${player.wwcd > 0 ? `<span class="wwcd-badge">${player.wwcd}</span>` : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `
            wrapper.appendChild(mvpsContainer)
        } else {
            // For Standings (already full list usually, but if paginated later, same logic applies)
            // Currently standings are not paginated, so cloning is fine
            if (standingsCard) {
                const cardClone = standingsCard.cloneNode(true)
                cardClone.classList.add('force-desktop')
                // Remove data-labels
                const cells = cardClone.querySelectorAll('td')
                cells.forEach(cell => cell.removeAttribute('data-label'))
                wrapper.appendChild(cardClone)
            }
        }

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
                        
                        /* Table Styles for both Standings and MVPs */
                        .standings-table, .mvps-table { 
                            display: table !important; 
                            border-collapse: collapse !important;
                            width: 100% !important;
                        }
                        thead { display: table-header-group !important; }
                        tbody { display: table-row-group !important; }
                        tr { 
                            display: table-row !important; 
                            margin-bottom: 0 !important; 
                            border: none !important; 
                            background-color: transparent !important; 
                        }
                        td, th { 
                            display: table-cell !important; 
                            width: auto !important; 
                            text-align: center !important; 
                            padding: 1rem !important; 
                            border-bottom: 1px solid #334155 !important;
                            color: #cbd5e1 !important;
                        }
                        td::before { display: none !important; }
                        
                        /* Specific Column Styles */
                        .team-col, .player-col { 
                            text-align: left !important; 
                            padding-left: 1rem !important;
                            color: white !important;
                            font-weight: 600 !important;
                        }
                        .rank-col { 
                            position: static !important;
                            font-weight: 500 !important;
                        }
                        .points-col, .kills-col strong {
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
                        
                        /* MVP Specifics */
                        .team-badges { display: flex !important; gap: 0.5rem !important; }
                        .team-badge { 
                            background-color: #334155 !important; 
                            color: #cbd5e1 !important;
                            padding: 0.25rem 0.5rem !important;
                            border-radius: 4px !important;
                            font-size: 0.75rem !important;
                        }
                    `
                    clonedDoc.head.appendChild(style)
                }
            })

            const image = canvas.toDataURL('image/png')
            const link = document.createElement('a')
            link.href = image
            const type = showMVPs ? 'mvps' : 'standings'
            link.download = `${tournament?.name || 'tournament'}-${type}.png`
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

    // Get theme from URL param (fallback/override) or tournament data
    const urlParams = new URLSearchParams(window.location.search)
    const urlTheme = urlParams.get('theme')
    const hideMvp = urlParams.get('hideMvp') === 'true'
    const activeTheme = urlTheme || tournament?.theme || 'default'

    if (loading) return (
        <div className={`live-container loading theme-${activeTheme}`}>
            <div className="loading-spinner"></div>
            <p>Loading tournament data...</p>
        </div>
    )

    if (error) return (
        <div className={`live-container error theme-${activeTheme}`}>
            <AlertCircle size={48} />
            <h2>Error Loading Tournament</h2>
            <p>{error}</p>
        </div>
    )

    return (
        <div className={`live-container theme-${activeTheme}`}>
            {tournament && (
                <SEO
                    title={`${tournament.name} - Live Standings`}
                    description={`Live standings and results for ${tournament.name}. Follow real-time updates, team rankings, and MVP stats on LazarFlow.`}
                    keywords={PAGE_SEO.liveTournament(tournament.name).keywords}
                    url={window.location.href}
                    structuredData={generateTournamentSchema(tournament, teams)}
                />
            )}

            <header className="live-header">
                <div className="header-inner">
                    <div className="header-left">
                        <Trophy size={32} className="trophy-icon" />
                        <h1>{tournament.name}</h1>
                        <span className="live-badge">LIVE</span>
                    </div>

                    <div className="header-actions">
                        {!hideMvp && (
                            <button
                                className={`view-toggle-btn ${showMVPs ? 'active' : ''}`}
                                onClick={() => setShowMVPs(!showMVPs)}
                            >
                                <Award size={18} />
                                <span className="btn-text">{showMVPs ? 'Show Standings' : 'Show MVPs'}</span>
                            </button>
                        )}

                        <button
                            className="download-btn"
                            onClick={handleDownloadImage}
                            disabled={downloading}
                        >
                            {downloading ? (
                                <span className="spinner-sm"></span>
                            ) : (
                                <Download size={18} />
                            )}
                            <span className="btn-text">{downloading ? 'Saving...' : 'Download'}</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="live-content" role="main">
                {!showMVPs ? (
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

                        {/* Mobile Card View */}
                        <div className="mobile-standings-list">
                            {teams.map((team, index) => (
                                <div key={team.id} className={`mobile-team-card ${index < 3 ? `top-${index + 1}` : ''}`}>
                                    <div
                                        className="mobile-card-content"
                                        onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                                    >
                                        {/* Header: Rank, Name, Total */}
                                        <div className="mobile-card-header">
                                            <div className="mobile-rank-badge">{index + 1}</div>
                                            <h3 className="mobile-team-name">{team.team_name}</h3>
                                            <div className="mobile-total-points">
                                                <span className="points-value">{team.total}</span>
                                                <span className="points-label">PTS</span>
                                            </div>
                                        </div>

                                        {/* Stats Grid - Always Visible */}
                                        <div className="mobile-stats-grid">
                                            <div className="stat-item">
                                                <span className="stat-label">Matches</span>
                                                <span className="stat-value">{team.points.matches_played || 0}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">WWCD</span>
                                                <span className="stat-value">{team.points.wins || 0}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Place Pts</span>
                                                <span className="stat-value">{team.points.placement_points || 0}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Kill Pts</span>
                                                <span className="stat-value">{team.points.kill_points || 0}</span>
                                            </div>
                                        </div>

                                        {/* Expand Indicator */}
                                        <div className="mobile-expand-indicator">
                                            <span>{expandedTeam === team.id ? 'Hide Members' : 'View Members'}</span>
                                            <span className="expand-icon">{expandedTeam === team.id ? '▼' : '▶'}</span>
                                        </div>
                                    </div>

                                    {expandedTeam === team.id && team.members && team.members.length > 0 && (
                                        <div className="mobile-card-details">
                                            <div className="mobile-members-list">
                                                <div className="mobile-members-header">
                                                    <span className="header-name">Player</span>
                                                    <span className="header-stat">Kills</span>
                                                    <span className="header-stat">Matches</span>
                                                </div>
                                                {team.members.map((member, idx) => (
                                                    <div key={idx} className="mobile-member-item">
                                                        <span className="member-name">{member.name || member}</span>
                                                        <span className="member-stat">{member.kills || 0}</span>
                                                        <span className="member-stat">{member.matches_played || 0}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </article>
                ) : (
                    <article className="mvps-card" aria-labelledby="mvps-heading">
                        <h2 id="mvps-heading" className="sr-only">Tournament MVPs</h2>
                        {mvps.length === 0 ? (
                            <div className="empty-mvps">
                                <Award size={48} className="empty-icon" />
                                <h3>No Player Data</h3>
                                <p>No player statistics available yet.</p>
                            </div>
                        ) : (
                            <>
                                <table className="mvps-table" role="table" aria-label="Tournament MVPs">
                                    <thead>
                                        <tr>
                                            <th className="rank-col">#</th>
                                            <th className="player-col">Player</th>
                                            <th className="team-col">Team(s)</th>
                                            <th className="matches-col">M</th>
                                            <th className="kills-col">Kills</th>
                                            <th className="avg-col">Avg</th>
                                            <th className="wwcd-col">WWCD</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentMvps.map((player, index) => (
                                            <tr key={index} className={player.rank <= 3 ? `top-${player.rank}` : ''}>
                                                <td className="rank-col" data-label="#">
                                                    <span className="rank-number">
                                                        {player.rank === 1 && <Trophy size={16} className="gold-icon" />}
                                                        {player.rank === 2 && <Award size={16} className="silver-icon" />}
                                                        {player.rank === 3 && <Award size={16} className="bronze-icon" />}
                                                        {player.rank}
                                                    </span>
                                                </td>
                                                <td className="player-col" data-label="Player">
                                                    <strong>{player.name}</strong>
                                                </td>
                                                <td className="team-col" data-label="Team(s)">
                                                    <span className="team-badges">
                                                        {player.teams.map((team, idx) => (
                                                            <span key={idx} className="team-badge">
                                                                {team}
                                                            </span>
                                                        ))}
                                                    </span>
                                                </td>
                                                <td className="matches-col" data-label="M">{player.matches_played}</td>
                                                <td className="kills-col" data-label="Kills">
                                                    <strong>{player.kills}</strong>
                                                </td>
                                                <td className="avg-col" data-label="Avg">{player.avgKills}</td>
                                                <td className="wwcd-col" data-label="WWCD">
                                                    {player.wwcd > 0 ? (
                                                        <span className="wwcd-badge">
                                                            <Trophy size={14} />
                                                            {player.wwcd}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="pagination-controls">
                                        <button
                                            className="pagination-btn"
                                            onClick={() => paginate(currentPage - 1)}
                                            disabled={currentPage === 1}
                                        >
                                            Previous
                                        </button>
                                        <span className="pagination-info">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            className="pagination-btn"
                                            onClick={() => paginate(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </article>
                )}
            </main>
        </div>
    )
}

export default LiveTournament

