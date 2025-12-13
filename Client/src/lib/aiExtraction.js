import apiClient from './apiClient'

/**
 * Extract team names from text using AI backend
 * @param {string} text - Unstructured text containing team names
 * @returns {Promise<Array>} Array of team objects with name property
 */
export const extractTeamsFromText = async (text) => {
  console.log('🔍 Calling team extraction API...')

  try {
    const response = await apiClient.post('/extract-teams', { text })
    
    // Log the raw response for debugging
    console.log('🔍 Raw API Response:', response.data)

    const teams = response.data.teams || response.data

    if (teams && Array.isArray(teams)) {
      console.log(`✅ API returned ${teams.length} teams`)
      
      // Map to consistent format { name: "Team Name" }
      return teams.map(team => {
        if (typeof team === 'string') {
            return { name: team }
        } else if (typeof team === 'object' && team !== null) {
            // Handle { team_name: "Name" } or { name: "Name" }
            return { name: team.team_name || team.name || JSON.stringify(team) }
        }
        return { name: String(team) }
      })
    } else {
      console.error('❌ Invalid response format:', response.data)
      throw new Error('Invalid response format: "teams" array not found')
    }
  } catch (error) {
    console.error('❌ Error extracting teams:', error)
    throw error
  }
}

// Export alias for backward compatibility (in case UI still calls this)
export const extractTeamsFromImage = extractTeamsFromText
