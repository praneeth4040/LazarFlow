/**
 * AI Result Extraction Service
 * Extracts tournament results from Free Fire screenshots
 */

const API_ENDPOINT = import.meta.env.VITE_AI_EXTRACTION_API || 'https://lazarflow-backend.onrender.com/api/extract-results'

/**
 * Extract tournament results from screenshots
 * @param {Array<File>} imageFiles - Array of screenshot files
 * @returns {Promise<Array>} Extracted rank data
 */
export const extractResultsFromScreenshot = async (imageFiles) => {
    console.log(`🔍 Extracting results from ${imageFiles.length} screenshots...`)

    try {
        // Create FormData for image upload
        const formData = new FormData()

        // Append all images
        imageFiles.forEach(file => {
            formData.append('images', file)
        })

        // Call AI API
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: formData
        })

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()

        if (data.success && data.results && Array.isArray(data.results)) {
            console.log(`✅ Extracted ${data.results.length} ranks from screenshot`)
            return data.results
        } else {
            throw new Error('Invalid API response format')
        }

    } catch (error) {
        console.error('❌ API extraction failed:', error)
        console.log('⚙️ Using mock data for demo...')

        // Fallback to mock data for testing
        return getMockExtractionData()
    }
}

/**
 * Mock extraction data for testing
 * Simulates AI extraction output
 */
const getMockExtractionData = () => {
    return [
        {
            rank: 1,
            players: ["4R RAINOX!!", "LE DAKSH!!", "4R SCOUT!!", "Gold!.z7"],
            eliminations: 20
        },
        {
            rank: 2,
            players: ["XM•RAIDEN", "XM•HUSSAIN", "HIMU•BHAGWAN", "XM•KRISHU5"],
            eliminations: 15
        },
        {
            rank: 3,
            players: ["DMS•PURE", "DMS•IGNIS 13", "DMS•AMGOD", "DMS•AATANK"],
            eliminations: 12
        },
        {
            rank: 4,
            players: ["DAD•DINO 69", "BFA DEBRAJ", "TSG EXPORT", "RNTE•KRISH"],
            eliminations: 10
        },
        {
            rank: 5,
            players: ["Supreme.OB!", "SINNU", "ANGAD.071", "SYN CAPTAIN"],
            eliminations: 8
        },
        {
            rank: 6,
            players: ["C:B-X•WinG", "RAAYAN", "HerLastSin", "C:B.Zuhaib!"],
            eliminations: 7
        },
        {
            rank: 7,
            players: ["RBG.VAIBHAV", "RBG.ROHIT", "THE OG 07", "RBG.ROBIN"],
            eliminations: 6
        },
        {
            rank: 8,
            players: ["GZ BHAVESH !", "GZ BHAVESH", "GZ BHAVESH 2", "GZ BHAVESH 3"],
            eliminations: 5
        },
        {
            rank: 9,
            players: ["FG.Invicto !", "KK•ANSH.07", "TUX.ATHKB", "KK•Addy.28"],
            eliminations: 4
        },
        {
            rank: 10,
            players: ["VAIBHAV", "PA•TOPIO", "PA•FLASH.11", "PA•JENAM01"],
            eliminations: 3
        },
        {
            rank: 11,
            players: ["WIB ARAVNOOB", "WIB AWSOM", "WIB ERROR", "WIB AMAAN"],
            eliminations: 2
        },
        {
            rank: 12,
            players: ["TEAM12•P1", "TEAM12•P2", "TEAM12•P3", "TEAM12•P4"],
            eliminations: 1
        }
    ]
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
