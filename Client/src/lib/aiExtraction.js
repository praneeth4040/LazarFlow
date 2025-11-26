import apiClient from './apiClient'

/**
 * Extract team names from text using AI backend
 * @param {string} text - Unstructured text containing team names
 * @returns {Promise<Array>} Array of team objects with name property
 */
export const extractTeamsFromText = async (text) => {
  console.log('🔍 Calling team extraction API...')

  const response = await apiClient.post('/api/extract-teams', { text })

  if (response.data.teams && Array.isArray(response.data.teams)) {
    console.log(`✅ API returned ${response.data.teams.length} teams`)
    // Map strings to objects with name property
    return response.data.teams.map(team => ({ name: team }))
  } else {
    throw new Error('Invalid response format')
  }
}

// Export alias for backward compatibility
export const extractTeamsFromImage = extractTeamsFromText
