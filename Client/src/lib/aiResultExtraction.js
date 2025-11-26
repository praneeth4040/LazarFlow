import apiClient from './apiClient'

/**
 * Extract tournament results from screenshots
 * @param {Array<File>} imageFiles - Array of screenshot files
 * @returns {Promise<Array>} Extracted rank data
 */
export const extractResultsFromScreenshot = async (imageFiles) => {
    console.log(`🔍 Extracting results from ${imageFiles.length} screenshots...`)

    // Create FormData for image upload
    const formData = new FormData()

    // Append all images
    imageFiles.forEach(file => {
        formData.append('images', file)
    })

    // Call AI API with FormData (axios automatically sets correct Content-Type)
    const response = await apiClient.post('/api/extract-results', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })

    if (response.data.success && response.data.results && Array.isArray(response.data.results)) {
        console.log(`✅ Extracted ${response.data.results.length} ranks from screenshot`)
        return response.data.results
    } else {
        throw new Error('Invalid API response format')
    }
}

/**
 * Normalize player name for matching
 * Removes special characters and converts to lowercase
 */
export const normalizePlayerName = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Check if teams need mapping (no members set)
 */
export const needsMapping = (teams) => {
    return teams.every(team => !team.members || team.members.length === 0)
}

/**
 * Auto-match extracted players to teams
 * @param {Array} extractedData - Extracted rank data
 * @param {Array} teams - Tournament teams
 * @param {Object} tournament - Tournament config
 * @returns {Object} Matched results and unmapped ranks
 */
export const autoMatchPlayers = (extractedData, teams, tournament) => {
    const results = []
    const unmappedRanks = []

    for (const rankData of extractedData) {
        // Find team by checking if players exist in members
        const team = teams.find(t => {
            if (!t.members || t.members.length === 0) return false

            // Count how many players match
            const matchCount = rankData.players.filter(player =>
                t.members.some(member =>
                    normalizePlayerName(player) === normalizePlayerName(member)
                )
            ).length

            // Require at least 2 players to match (50% threshold for 4-player squad)
            return matchCount >= 2
        })

        if (team) {
            // Calculate points
            const placementPoints = getPlacementPoints(rankData.rank, tournament.points_system)
            const killPoints = rankData.eliminations * (tournament.kill_points || 1)

            results.push({
                team_id: team.id,
                team_name: team.team_name,
                position: rankData.rank,
                kills: rankData.eliminations,
                placement_points: placementPoints,
                kill_points: killPoints,
                total_points: placementPoints + killPoints
            })
        } else {
            // No match found - needs manual mapping
            unmappedRanks.push(rankData)
        }
    }

    return { results, unmappedRanks }
}

/**
 * Get placement points for a given rank
 */
const getPlacementPoints = (rank, pointsSystem) => {
    if (!pointsSystem || !Array.isArray(pointsSystem)) return 0

    const entry = pointsSystem.find(p => p.placement === rank)
    return entry ? entry.points : 0
}

/**
 * Validate extracted data format
 */
export const validateExtractionData = (data) => {
    if (!Array.isArray(data)) return false

    return data.every(item =>
        item.rank &&
        Array.isArray(item.players) &&
        item.players.length > 0 &&
        typeof item.eliminations === 'number'
    )
}

export default {
    extractResultsFromScreenshot,
    normalizePlayerName,
    needsMapping,
    autoMatchPlayers,
    validateExtractionData
}
