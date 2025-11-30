import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Trophy, AlertCircle, Download } from 'lucide-react'
import html2canvas from 'html2canvas'
import './LiveTournament.css'

const LiveTournament = () => {
    const { liveid } = useParams()
    const [tournament, setTournament] = useState(null)
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchLiveData()

        // Auto-refresh every 1 minute
        const interval = setInterval(fetchLiveData, 60000)
        return () => clearInterval(interval)
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
        const element = document.querySelector('.standings-card')
        if (!element) return

        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#1e293b', // Match card background
                scale: 2, // Higher quality
                windowWidth: 1400, // Force desktop width to bypass mobile media queries
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.querySelector('.standings-card')
                    if (clonedElement) {
                        // 1. Force a fixed width on the clone
                        clonedElement.style.width = '1200px'
                        clonedElement.style.maxWidth = 'none'
                        clonedElement.style.margin = '0 auto'

                        // 2. Add the force-desktop class to trigger the CSS overrides in LiveTournament.css
                        clonedElement.classList.add('force-desktop')

                        // 3. Remove data-labels to prevent mobile pseudo-elements from showing text
                        const cells = clonedElement.querySelectorAll('td')
                        cells.forEach(cell => cell.removeAttribute('data-label'))

                        // 4. Inject critical CSS overrides directly into the clone (Backup safety net)
                        const style = clonedDoc.createElement('style')
                        style.innerHTML = `
                            .standings-table { display: table !important; }
                            .standings-table thead { display: table-header-group !important; }
                            .standings-table tbody { display: table-row-group !important; }
                            .standings-table tr { display: table-row !important; margin-bottom: 0 !important; border: none !important; background-color: transparent !important; }
                            .standings-table td { display: table-cell !important; width: auto !important; text-align: center !important; padding: 1rem !important; border-bottom: 1px solid #334155 !important; }
                            .standings-table td::before { display: none !important; content: none !important; }
                            .standings-table td.team-col { text-align: left !important; padding-left: 1rem !important; margin-bottom: 0 !important; padding-bottom: 1rem !important; border-bottom: 1px solid #334155 !important; }
                            .standings-table td.rank-col { position: static !important; width: auto !important; border: none !important; padding: 1rem !important; font-size: inherit !important; }
                        `
                        clonedElement.appendChild(style)
                    }
                }
            })

            const image = canvas.toDataURL('image/png')
            const link = document.createElement('a')
            link.href = image
            link.download = `${tournament?.name || 'tournament'}-standings.png`
            link.click()
        } catch (err) {
            console.error('Error generating image:', err)
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
            <header className="live-header">
                <div className="header-inner">
                    <div className="header-left">
                        <Trophy className="trophy-icon" size={32} />
                        <div>
                            <h1>{tournament.name}</h1>
                            <span className="live-badge">LIVE</span>
                        </div>
                    </div>
                    <button onClick={handleDownloadImage} className="download-btn" title="Download Image">
                        <Download size={20} />
                        <span className="btn-text">Download</span>
                    </button>
                </div>
            </header>

            <main className="live-content">
                <div className="standings-card">
                    <table className="standings-table">
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
                                <tr key={team.id} className={index < 3 ? `top-${index + 1}` : ''}>
                                    <td className="rank-col" data-label="#">
                                        <span className="rank-number">{index + 1}</span>
                                    </td>
                                    <td className="team-col" data-label="Team">{team.team_name}</td>
                                    <td className="matches-col" data-label="M">{team.points.matches_played || 0}</td>
                                    <td className="wins-col" data-label="WWCD">{team.points.wins || 0}</td>
                                    <td className="place-col" data-label="Place">{team.points.placement_points || 0}</td>
                                    <td className="kills-col" data-label="Kills">{team.points.kill_points || 0}</td>
                                    <td className="points-col" data-label="Total">{team.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    )
}

export default LiveTournament

