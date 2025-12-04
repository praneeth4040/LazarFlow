// SEO Configuration - Centralized SEO constants and templates
export const SEO_CONFIG = {
    siteName: 'LazarFlow',
    siteUrl: 'https://lazarflow.com',
    defaultTitle: 'LazarFlow - Free Esports Tournament Points Table Maker | Live Leaderboards & Standings',
    defaultDescription: 'Create professional esports tournament points tables, live leaderboards, and standings instantly. Free AI-powered tournament management system for gaming competitions.',
    defaultKeywords: [
        'esports tournament',
        'points table',
        'leaderboard maker',
        'tournament management',
        'esports standings',
        'gaming tournament',
        'live scoreboard',
        'PUBG tournament',
        'Valorant tournament',
        'esports points system',
        'tournament tracker',
        'competitive gaming',
        'esports organizer',
        'free tournament software',
        'esports leaderboard',
        'tournament points calculator'
    ],
    twitterHandle: '@lazarflow',
    socialImage: '/og-image.png',
    themeColor: '#0f172a'
}

// Page-specific SEO configurations
export const PAGE_SEO = {
    home: {
        title: 'LazarFlow - Free Esports Tournament Points Table Maker | Live Leaderboards',
        description: 'Create professional esports tournament points tables and live leaderboards instantly. AI-powered tournament management for PUBG, Valorant, CS2 and all gaming competitions.',
        keywords: 'esports tournament, points table maker, leaderboard, tournament management, live standings'
    },
    liveTournament: (tournamentName) => ({
        title: `${tournamentName} - Live Tournament Standings | LazarFlow`,
        description: `View live standings and points table for ${tournamentName}. Real-time esports tournament leaderboard with team rankings and statistics.`,
        keywords: `${tournamentName}, live tournament, esports standings, points table, leaderboard`
    }),
    dashboard: {
        title: 'Dashboard - Manage Your Tournaments | LazarFlow',
        description: 'Manage your esports tournaments, create points tables, and track live standings from your dashboard.',
        keywords: 'tournament dashboard, esports management, points table creator'
    }
}

// Generate structured data for tournaments
export const generateTournamentSchema = (tournament, teams) => {
    return {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: tournament.name,
        description: `Live esports tournament with ${teams?.length || 0} participating teams`,
        sport: 'Esports',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
        location: {
            '@type': 'VirtualLocation',
            url: `${SEO_CONFIG.siteUrl}/live/${tournament.id}`
        },
        competitor: teams?.map(team => ({
            '@type': 'SportsTeam',
            name: team.team_name
        })) || []
    }
}

export default SEO_CONFIG
