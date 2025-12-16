import { useState, useEffect, useCallback } from 'react'
import { getTournamentById, getTournamentTeams } from '../lib/dataService'
import { subscribeToTournamentTeams } from '../lib/realtime'
import { subscribeToLiveUpdates } from '../lib/liveSync'

export const useLiveTournament = (liveid, previewConfig) => {
    const [tournament, setTournament] = useState(null)
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchLiveData = useCallback(async () => {
        if (!liveid) return;
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
    }, [liveid]);

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
                { name: 'Mortal', kills: 15, matches: 3, avg_kills: 5.0 },
                { name: 'Viper', kills: 12, matches: 3, avg_kills: 4.0 },
                { name: 'Regaltos', kills: 8, matches: 3, avg_kills: 2.6 },
                { name: 'Scout', kills: 5, matches: 3, avg_kills: 1.6 }
            ];
            mockTeams[1].team_name = 'GodLike Esports';
            mockTeams[1].members = [
                { name: 'Jonathan', kills: 18, matches: 3, avg_kills: 6.0 },
                { name: 'Neyoo', kills: 10, matches: 3, avg_kills: 3.3 },
                { name: 'ZGod', kills: 6, matches: 3, avg_kills: 2.0 },
                { name: 'Shadow', kills: 6, matches: 3, avg_kills: 2.0 }
            ];
            mockTeams[2].team_name = 'Blind Esports';
            mockTeams[2].members = [
                { name: 'Manya', kills: 12, matches: 3, avg_kills: 4.0 },
                { name: 'Nakul', kills: 12, matches: 3, avg_kills: 4.0 },
                { name: 'Joker', kills: 8, matches: 3, avg_kills: 2.6 },
                { name: 'Addy', kills: 8, matches: 3, avg_kills: 2.6 }
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
    }, [liveid, previewConfig, fetchLiveData])

    return { tournament, teams, loading, error, refetch: fetchLiveData }
}
