import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Trophy, AlertCircle } from 'lucide-react'
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
                    <Trophy className="trophy-icon" size={32} />
                    <div>
                        <h1>{tournament.name}</h1>
                        <span className="live-badge">LIVE</span>
                    </div>
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
                                    <td className="rank-col">
                                        <span className="rank-number">{index + 1}</span>
                                    </td>
                                    <td className="team-col">{team.team_name}</td>
                                    <td className="matches-col">{team.points.matches_played || 0}</td>
                                    <td className="wins-col">{team.points.wins || 0}</td>
                                    <td className="place-col">{team.points.placement_points || 0}</td>
                                    <td className="kills-col">{team.points.kill_points || 0}</td>
                                    <td className="points-col">{team.total}</td>
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
