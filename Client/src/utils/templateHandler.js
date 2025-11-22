/**
 * Template Handler Utility
 * Core functions for calculating tournament standings and formatting data
 */

/**
 * Calculate standings from teams array
 * @param {Array} teams - Array of team objects
 * @returns {Array} Standings array with rankings
 */
export const calculateStandings = (teams) => {
  try {
    if (!Array.isArray(teams) || teams.length === 0) {
      return []
    }

    // Sort by total points descending
    const sorted = [...teams].sort((a, b) => {
      const getPoints = (t) => {
        if (t.total_points && typeof t.total_points === 'object') {
          return (t.total_points.kill_points || 0) + (t.total_points.placement_points || 0)
        }
        return t.total_points || t.totalPoints || 0
      }
      return getPoints(b) - getPoints(a)
    })

    // Add rankings
    return sorted.map((team, index) => {
      const tp = team.total_points
      const isObj = tp && typeof tp === 'object'

      return {
        rank: index + 1,
        name: team.team_name || team.name || 'Unknown Team',
        matchesPlayed: isObj ? (tp.matches_played || 0) : (team.matches_played || team.matchesPlayed || 0),
        wins: isObj ? (tp.wins || 0) : (team.wins || 0),
        placementPoints: isObj ? (tp.placement_points || 0) : (team.placement_points || team.placementPoints || 0),
        killPoints: isObj ? (tp.kill_points || 0) : (team.kill_points || team.killPoints || 0),
        totalPoints: isObj ? ((tp.kill_points || 0) + (tp.placement_points || 0)) : (tp || team.totalPoints || 0)
      }
    })
  } catch (error) {
    console.error('Error calculating standings:', error)
    return []
  }
}

/**
 * Format tournament data for display
 * @param {Object} tournament - Tournament object
 * @param {Array} standings - Standings array
 * @returns {Object} Formatted data object
 */
export const formatTournamentData = (tournament, standings) => {
  try {
    return {
      tournamentName: tournament.name || 'Tournament',
      organizer: tournament.organizer || 'LazarFlow',
      eventName: tournament.event_name || tournament.name || '',
      date: tournament.created_at
        ? new Date(tournament.created_at).toLocaleDateString()
        : new Date().toLocaleDateString(),
      gameType: tournament.game_type || tournament.game || 'Esports',
      standings: standings || []
    }
  } catch (error) {
    console.error('Error formatting tournament data:', error)
    return {
      tournamentName: 'Tournament',
      organizer: 'LazarFlow',
      eventName: '',
      date: new Date().toLocaleDateString(),
      gameType: 'Esports',
      standings: []
    }
  }
}

export default {
  calculateStandings,
  formatTournamentData
}
