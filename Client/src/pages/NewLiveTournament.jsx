import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getTournamentById, getTournamentTeams } from '../lib/dataService'
import { subscribeToTournamentTeams } from '../lib/realtime'
import { subscribeToLiveUpdates } from '../lib/liveSync'
import SEO from '../components/SEO'
import './NewLiveTournament.css'
import { Instagram, Twitter, Youtube, Twitch, Facebook, Globe, MessageSquare, Link as LinkIcon } from 'lucide-react'

const NewLiveTournament = ({ previewConfig }) => {
    const { liveid } = useParams()
    const [tournament, setTournament] = useState(null)
    const [teams, setTeams] = useState([])
    const [expandedTeamId, setExpandedTeamId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 12

    const toggleTeam = (teamId) => {
        setExpandedTeamId(expandedTeamId === teamId ? null : teamId)
    }

    useEffect(() => {
        const fontFamily = (previewConfig?.theme?.fontFamily) || (typeof tournament?.theme_config === 'string'
            ? (() => { try { return JSON.parse(tournament.theme_config)?.fontFamily } catch { return undefined } })()
            : tournament?.theme_config?.fontFamily)
        if (fontFamily) {
            const fontName = fontFamily.split(',')[0].replace(/['"]/g, '')
            const link = document.createElement('link')
            link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, '+')}:wght@300;400;500;600;700;800&display=swap`
            link.rel = 'stylesheet'
            document.head.appendChild(link)
            return () => {
                document.head.removeChild(link)
            }
        }
    }, [previewConfig?.theme?.fontFamily, tournament?.theme_config?.fontFamily])

    useEffect(() => {
        if (previewConfig) {
            // Preview Mode: Use mock data or config data
            console.log('🎨 LiveTournament in Preview Mode')
            setTournament({
                name: previewConfig.tournament?.name || 'LAZARFLOW CHAMPIONSHIP',
                sub_heading: previewConfig.tournament?.subHeading || 'GRAND FINALS - DAY 1',
                game: 'BGMI',
                status: 'active',
                ...previewConfig.tournament
            })
            
            const mockTeams = Array(16).fill(null).map((_, i) => ({
                id: `mock-team-${i}`,
                team_name: `Team ${i + 1}`,
                total: 100 - (i * 5),
                points: { 
                    kill_points: 40 - (i * 2), 
                    placement_points: 60 - (i * 3), 
                    matches_played: 3, 
                    wins: i === 0 ? 2 : 0 
                },
                members: [
                    { name: 'Player 1', kills: 10, matches: 3, avg_kills: 3.3 },
                    { name: 'Player 2', kills: 12, matches: 3, avg_kills: 4.0 }, 
                    { name: 'Player 3', kills: 8, matches: 3, avg_kills: 2.6 }, 
                    { name: 'Player 4', kills: 10, matches: 3, avg_kills: 3.3 }
                ]
            }))
            // Add some specific names for realism
            mockTeams[0].team_name = 'Team Soul';
            mockTeams[0].members = [
                {name: 'Mortal', kills: 15, matches: 3, avg_kills: 5.0}, 
                {name: 'Viper', kills: 12, matches: 3, avg_kills: 4.0}, 
                {name: 'Regaltos', kills: 8, matches: 3, avg_kills: 2.6}, 
                {name: 'Scout', kills: 5, matches: 3, avg_kills: 1.6}
            ];
            mockTeams[1].team_name = 'GodLike Esports';
            mockTeams[1].members = [
                {name: 'Jonathan', kills: 18, matches: 3, avg_kills: 6.0}, 
                {name: 'Neyoo', kills: 10, matches: 3, avg_kills: 3.3}, 
                {name: 'ZGod', kills: 6, matches: 3, avg_kills: 2.0}, 
                {name: 'Shadow', kills: 6, matches: 3, avg_kills: 2.0}
            ];
            mockTeams[2].team_name = 'Blind Esports';
            mockTeams[2].members = [
                {name: 'Manya', kills: 12, matches: 3, avg_kills: 4.0}, 
                {name: 'Nakul', kills: 12, matches: 3, avg_kills: 4.0}, 
                {name: 'Joker', kills: 8, matches: 3, avg_kills: 2.6}, 
                {name: 'Addy', kills: 8, matches: 3, avg_kills: 2.6}
            ];
            
            setTeams(mockTeams)
            setLoading(false)
            return
        }

        if (!liveid) return

        let unsubscribeRealtime = null
        let unsubscribeChannel = null
        let intervalId = null

        const init = async () => {
            console.log('🌐 LiveTournament init for id:', liveid)
            await fetchLiveData()

            unsubscribeRealtime = subscribeToTournamentTeams(liveid, () => {
                console.log('🔔 Realtime change detected, refetching...')
                fetchLiveData()
            })

            unsubscribeChannel = subscribeToLiveUpdates((message) => {
                if (message?.type === 'results-updated' && message.tournamentId === liveid) {
                    fetchLiveData()
                }
            })

            intervalId = setInterval(() => {
                fetchLiveData()
            }, 30000)
        }

        init()

        return () => {
            if (typeof unsubscribeRealtime === 'function') unsubscribeRealtime()
            if (typeof unsubscribeChannel === 'function') unsubscribeChannel()
            if (intervalId) clearInterval(intervalId)
        }
    }, [liveid, previewConfig])

    const fetchLiveData = async () => {
        try {
            setLoading(true)

            const tournamentData = await getTournamentById(liveid)
            setTournament(tournamentData)

            const teamsData = await getTournamentTeams(liveid)

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

  // Construct Theme Styles
  const rawTheme = tournament?.theme_config;
  let dbTheme = rawTheme;
  if (typeof rawTheme === 'string') {
    try {
      dbTheme = JSON.parse(rawTheme);
    } catch {
      dbTheme = {};
    }
  }
  const themeSource = previewConfig?.theme || dbTheme || {};
  const customStyles = themeSource ? {
    '--live-bg-color': themeSource.backgroundColor || previewConfig?.theme?.backgroundColor || '#ffffff',
    '--live-bg-image': themeSource.backgroundImage ? `url("${themeSource.backgroundImage}")` : 'none',
    '--live-font-family': themeSource.fontFamily || 'Outfit, sans-serif',
    '--live-border-color': themeSource.borderColor || '#e2e8f0',
    '--live-table-bg': themeSource.tableBackgroundColor || 'transparent',
    '--live-table-cell-skew': typeof themeSource.tableCellSkew === 'number' ? `${themeSource.tableCellSkew}deg` : '0deg',
    '--live-cell-gap': typeof themeSource.cellGap === 'number' ? `${themeSource.cellGap}px` : '4px',
    '--live-cell-cut-size': typeof themeSource.cellCutSize === 'number' ? `${themeSource.cellCutSize}px` : '8px',
    '--live-body-text-color': '#1a202c',

    // Header
    '--live-header-bg': themeSource.headerBackgroundColor || 'transparent',
    '--live-header-text-color': themeSource.headerTextColor || '#ffffff',
    '--live-header-bg-image': themeSource.headerBackgroundImage ? `url("${themeSource.headerBackgroundImage}")` : 'none',
    '--live-pt-header-bg': (themeSource.tableStyles?.header?.backgroundColor) || 'transparent',
    '--live-pt-header-text-color': (themeSource.tableStyles?.header?.textColor) || '#1a202c',

    // Footer
    '--live-footer-bg-color': themeSource.footerBackgroundColor || '#000000',
    '--live-footer-text-color': themeSource.footerTextColor || '#ffffff',
    '--live-footer-bg-image': themeSource.footerBackgroundImage ? `url("${themeSource.footerBackgroundImage}")` : 'none',

    // Column Styles
    '--live-col-rank-bg': (themeSource.tableStyles?.rank?.backgroundColor) || 'transparent',
    '--live-col-rank-text': (themeSource.tableStyles?.rank?.textColor) || 'inherit',
    '--live-col-team-bg': (themeSource.tableStyles?.team?.backgroundColor) || 'transparent',
    '--live-col-team-text': (themeSource.tableStyles?.team?.textColor) || 'inherit',
    '--live-col-wwcd-bg': (themeSource.tableStyles?.wwcd?.backgroundColor) || 'transparent',
    '--live-col-wwcd-text': (themeSource.tableStyles?.wwcd?.textColor) || 'inherit',
    '--live-col-place-bg': (themeSource.tableStyles?.place?.backgroundColor) || 'transparent',
    '--live-col-place-text': (themeSource.tableStyles?.place?.textColor) || 'inherit',
    '--live-col-kills-bg': (themeSource.tableStyles?.kills?.backgroundColor) || 'transparent',
    '--live-col-kills-text': (themeSource.tableStyles?.kills?.textColor) || 'inherit',
    '--live-col-total-bg': (themeSource.tableStyles?.total?.backgroundColor) || 'transparent',
    '--live-col-total-text': (themeSource.tableStyles?.total?.textColor) || 'inherit',

  } : {}

  if (customStyles) {
    const shape = themeSource.cellShape || previewConfig?.theme?.cellShape || 'square'
    let radius = '0px'
    let clip = 'none'
    const cut = customStyles['--live-cell-cut-size'] || '8px'
    if (shape === 'rounded') {
      radius = '6px'
    } else if (shape === 'pill') {
      radius = '9999px'
    } else if (shape === 'cut') {
      clip = `polygon(0 ${cut}, ${cut} 0, calc(100% - ${cut}) 0, 100% ${cut}, 100% calc(100% - ${cut}), calc(100% - ${cut}) 100%, ${cut} 100%, 0 calc(100% - ${cut}))`
    }
    customStyles['--live-cell-radius'] = radius
    customStyles['--live-cell-clip'] = clip
  }

    const SOCIAL_ICONS = {
        instagram: Instagram,
        twitter: Twitter,
        youtube: Youtube,
        twitch: Twitch,
        facebook: Facebook,
        discord: MessageSquare,
        website: Globe
    }

    return (
        <div className="live-layout" style={customStyles}>
            {tournament && (
                <SEO
                    title={`${tournament.name} - Live Standings`}
                    description={`Live standings for ${tournament.name}`}
                    url={window.location.href}
                />
            )}
            
            {/* Background Image Layer - customizable in future */}
            <div className="live-bg-layer"></div>

            {/* Header Section */}
            <header className="live-header">
                {/* Left Sponsor / Game Logo */}
                <div className="header-left">
                    <div className="sponsor-box">
                        {themeSource?.headerLeftSponsor ? (
                            <img src={themeSource.headerLeftSponsor} alt="Sponsor" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                            <span>SPONSOR</span>
                        )}
                    </div>
                </div>

                {/* Center Title */}
                <div className="header-center">
                    <div className="header-title-wrapper">
                        <div className="tournament-logo-container" style={{ display: themeSource?.headerCenterLogo ? 'block' : 'none' }}>
                            {themeSource?.headerCenterLogo && (
                                <img src={themeSource.headerCenterLogo} alt="Logo" style={{ width: '120px', height: '60px', objectFit: 'contain' }} />
                            )}
                        </div>
                        <div className="header-text-content">
                            <h1 className="main-title">{tournament?.name || 'TOURNAMENT NAME'}</h1>
                            <h2 className="sub-title">{tournament?.sub_heading || 'OVERALL STANDINGS'}</h2>
                        </div>
                    </div>
                </div>

                {/* Right Sponsor */}
                <div className="header-right">
                    <div className="sponsor-box">
                        {themeSource?.headerRightSponsor ? (
                            <img src={themeSource.headerRightSponsor} alt="Game" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                            <span>GAME</span>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content - Points Table */}
            <main className="live-content">
                <div className="table-container">
                    <table className="points-table">
                        <thead>
                            <tr>
                                <th className="th-rank">#</th>
                                <th className="th-team">TEAM NAME</th>
                                <th className="th-wwcd">WWCD</th>
                                <th className="th-place">PLACE PTS</th>
                                <th className="th-kills">KILLS</th>
                                <th className="th-total">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((team, index) => (
                                <React.Fragment key={team.id || index}>
                                    <tr 
                                        className={`team-row ${expandedTeamId === (team.id || index) ? 'expanded' : ''}`}
                                        onClick={() => toggleTeam(team.id || index)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td className="td-rank">
                                            <div className="rank-badge">{(currentPage - 1) * itemsPerPage + index + 1}</div>
                                        </td>
                                        <td className="td-team">
                                            <span className="team-name">{team.team_name}</span>
                                        </td>
                                        <td className="td-wwcd">
                                            {team.points.wins > 0 ? (
                                                <span className="wwcd-count">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px', verticalAlign: 'text-bottom' }}>
                                                        <path d="M20.2 13.5l-1.3-6.6c-.3-1.6-1.7-2.8-3.3-2.8H14c-1.1 0-2.1.5-2.8 1.4-.7-.9-1.7-1.4-2.8-1.4H6.8c-1.6 0-3 1.2-3.3 2.8L2.2 13.5c-.3 1.5.7 2.9 2.2 3.1l6.8 1.1c.4.1.9-.1 1.1-.5l1.6-4.5c.2-.6 1.1-.6 1.3 0l1.6 4.5c.2.4.7.7 1.1.5l6.8-1.1c1.5-.2 2.5-1.6 2.2-3.1z"/>
                                                    </svg>
                                                    {team.points.wins}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="td-place">{team.points.placement_points}</td>
                                        <td className="td-kills">{team.points.kill_points}</td>
                                        <td className="td-total">{team.total}</td>
                                    </tr>
                                    
                                    {/* Expanded Player Stats Row */}
                                    {expandedTeamId === (team.id || index) && (
                                        <tr className="stats-row">
                                            <td colSpan="6" className="stats-cell">
                                                <div className="player-stats-container">
                                                    <table className="player-table">
                                                        <thead>
                                                            <tr>
                                                                 <th>PLAYER</th>
                                                                <th>MATCHES</th>
                                                                <th>AVG KILLS</th>
                                                                <th>TOTAL KILLS</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {team.members && team.members.map((member, mIndex) => (
                                                                <tr key={mIndex}>
                                                                    <td>{member.name || member}</td>
                                                                    <td>{member.matches || 0}</td>
                                                                    <td>{(member.avg_kills || 0).toFixed(1)}</td>
                                                                    <td><strong>{member.kills || 0}</strong></td>
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
                </div>
                <div className="pagination-controls" aria-label="pagination">
                    <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                        title="Previous"
                    >
                        ‹
                    </button>
                    <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(teams.length / itemsPerPage) || 1, p + 1))}
                        disabled={currentPage === (Math.ceil(teams.length / itemsPerPage) || 1)}
                        aria-label="Next page"
                        title="Next"
                    >
                        ›
                    </button>
                </div>
            </main>

            {/* Footer Section */}
            <footer className="live-footer">
                <div className="footer-left">
                    <span>{themeSource?.footerLeft || '@LazarFlow'}</span>
                </div>
                <div className="footer-center">
                    <span>{themeSource?.footerCenter || 'POWERED BY LAZARFLOW'}</span>
                </div>
                <div className="footer-right footer-socials">
                    {(themeSource?.footerSocials || []).map((item, idx) => {
                        const IconComp = SOCIAL_ICONS[item.type] || LinkIcon;
                        const href = item.url || '#';
                        return (
                            <a
                                key={`${item.type}-${idx}`}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={item.type}
                                className="footer-social-btn"
                            >
                                <IconComp size={18} />
                            </a>
                        );
                    })}
                    {(themeSource?.footerSocials || []).length === 0 && (
                        <span>{themeSource?.footerRight || 'lazarflow.com'}</span>
                    )}
                </div>
            </footer>
        </div>
    )
}

export default NewLiveTournament
