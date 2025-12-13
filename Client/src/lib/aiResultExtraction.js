import apiClient from './apiClient'

/**
 * Extract tournament results from screenshots
 * @param {Array<File>} imageFiles - Array of screenshot files
 * @param {Object} options - Extraction options
 * @param {boolean} options.split - Whether to split images (default: true)
 * @param {number} options.split_ratio - Split ratio (default: 0.5)
 * @param {number} options.crop_top - Top crop percentage (default: 0.0)
 * @param {number} options.crop_bottom - Bottom crop percentage (default: 0.0)
 * @returns {Promise<Array>} Extracted rank data
 */
export const extractResultsFromScreenshot = async (imageFiles, options = {}) => {
    console.log(`🔍 Extracting results from ${imageFiles.length} screenshots...`)
    console.log('⚙️ Extraction options:', options)

    // Create FormData for image upload
    const formData = new FormData()

    // Append all images
    imageFiles.forEach(file => {
        formData.append('images', file)
    })

    // Append options if they deviate from defaults or are explicitly provided
    if (options.split !== undefined) formData.append('split', options.split)
    if (options.split_ratio !== undefined) formData.append('split_ratio', options.split_ratio)
    if (options.crop_top !== undefined) formData.append('crop_top', options.crop_top)
    if (options.crop_bottom !== undefined) formData.append('crop_bottom', options.crop_bottom)

    try {
        // Call AI API with FormData (axios automatically sets correct Content-Type)
        const response = await apiClient.post('/extract-results', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })

        console.log('🔍 Raw Result Extraction Response:', response.data)

        // New format expectation: { teams: [{ team_name: "X", players: [...] }] }
        // We need to map this to what the frontend likely expects, or pass it through if the frontend is adaptable.
        // Based on CalculateResultsModal.jsx:
        // - It looks for `result.players` to update members
        // - It maps top-level fields (which might be missing in new format if we don't map them)
        
        let results = []

        if (response.data.teams && Array.isArray(response.data.teams)) {
            // Map new API format to frontend structure
            results = response.data.teams.map((team, index) => {
                // Calculate team aggregate stats from players if not provided at team level
                const players = team.players || []
                const teamKills = players.reduce((sum, p) => sum + (p.kills || 0), 0)
                
                // Extract rank from "position" field like "#1", removing '#'
                const rankMatch = typeof team.position === 'string' && team.position.match(/#(\d+)/);
                const rank = rankMatch ? parseInt(rankMatch[1], 10) : (index + 1);

                return {
                    rank: rank,
                    team_name: `Team at #${rank}`, // Positional name
                    kills: teamKills,
                    total_eliminations: teamKills,
                    eliminations: teamKills,
                    players: players.map(p => ({
                        name: p.name,
                        kills: p.kills || 0,
                        deaths: p.deaths || 0,
                        assists: p.assists || 0,
                        wwcd: 0
                    }))
                }
            })
        } else if (response.data.results && Array.isArray(response.data.results)) {
            // Fallback to legacy format just in case
            results = response.data.results.map((r, i) => ({
                ...r,
                rank: r.rank || (i + 1) // Ensure rank exists
            }))
        } else if (Array.isArray(response.data)) {
            results = response.data.map((r, i) => ({
                ...r,
                rank: r.rank || (i + 1) // Ensure rank exists
            }))
        }

        if (results && results.length > 0) {
            console.log(`✅ Extracted ${results.length} ranks from screenshot`)
            return results
        } else {
            console.error('❌ Invalid Result Response (no teams found):', response.data)
            throw new Error('Invalid API response format: "teams" array not found')
        }
    } catch (error) {
        console.error('❌ Error extracting results:', error)
        throw error
    }
}

/**
 * Normalize player name for matching
 * Removes special characters and converts to lowercase
 */
export const normalizePlayerName = (input) => {
    // Handle if input is an object (new format) or string (legacy)
    const name = (typeof input === 'object' && input !== null) ? (input.name || '') : input

    if (typeof name !== 'string') return ''
    return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const levenshtein = (a, b) => {
    const s = a || ''
    const t = b || ''
    const m = s.length
    const n = t.length
    if (m === 0) return n
    if (n === 0) return m
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = s[i - 1] === t[j - 1] ? 0 : 1
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            )
        }
    }
    return dp[m][n]
}

export const nameSimilarity = (a, b) => {
    const an = normalizePlayerName(a)
    const bn = normalizePlayerName(b)
    if (!an && !bn) return 1
    if (!an || !bn) return 0
    const dist = levenshtein(an, bn)
    const maxLen = Math.max(an.length, bn.length)
    if (maxLen === 0) return 1
    return 1 - dist / maxLen
}

export const fuzzyMatchName = (name, members, threshold = 0.8) => {
    const target = typeof name === 'object' && name !== null ? (name.name || '') : name
    let best = null
    let bestScore = 0
    for (const member of members || []) {
        const candidate = typeof member === 'object' && member !== null ? (member.name || member) : member
        const score = nameSimilarity(target, candidate)
        if (score > bestScore) {
            best = member
            bestScore = score
        }
    }
    return bestScore >= threshold ? { member: best, score: bestScore } : null
}

/**
 * Check if teams need mapping (no members set)
 */
export const needsMapping = (teams) => {
    return teams.every(team => !team.members || team.members.length === 0)
}
