// Client-side Team Extraction Logic
// Demo API implementation - replace with real API later

/**
 * Demo API call for team extraction
 * TODO: Replace this with your actual API endpoint
 * 
 * Expected API Response Format:
 * {
 *   success: true,
 *   teams: [
 *     { name: "Team Name 1" },
 *     { name: "Team Name 2" },
 *     ...
 *   ]
 * }
 */
const API_ENDPOINT = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/extract-teams'

export const extractTeamsFromText = async (text) => {
  console.log('🔍 Calling team extraction API...')

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.teams && Array.isArray(data.teams)) {
      console.log(`✅ API returned ${data.teams.length} teams`)
      // Map strings to objects if needed, or ensure format matches expected {name: string}
      return data.teams.map(name => ({ name }))
    } else {
      throw new Error('Invalid response format')
    }

  } catch (error) {
    console.error('❌ API call failed:', error)

    // Fallback to local extraction if API fails
    console.log('⚙️ Using fallback local extraction...')
    return extractTeamsLocally(text)
  }
}

/**
 * Local fallback extraction logic
 * This runs when the API is unavailable or fails
 */
export const extractTeamsLocally = (text) => {
  console.log('🔍 Extracting teams locally (fallback)...')

  const lines = text.split('\n')
  const extractedTeams = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines, links, dates, times, emojis, and instructions
    if (
      !trimmed ||
      trimmed.startsWith('http') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('`') ||
      trimmed.match(/^\d{1,2}[:\/]\d{1,2}/) || // Skip times and dates
      trimmed.includes(':') ||
      trimmed.includes('-') ||
      trimmed.startsWith('Prize') ||
      trimmed.startsWith('Date') ||
      trimmed.startsWith('Time') ||
      trimmed.startsWith('Schedule') ||
      trimmed.startsWith('Participating') ||
      trimmed.startsWith('Good') ||
      trimmed.includes('Back To Back') ||
      trimmed.includes('Qualify') ||
      trimmed.includes('Presented') ||
      trimmed.includes('🏆') ||
      trimmed.includes('🚀')
    ) {
      continue
    }

    // Add valid team names (3-100 chars, no numbers at start)
    if (trimmed.length > 2 && trimmed.length < 100 && !trimmed.match(/^\d/)) {
      extractedTeams.push({ name: trimmed })
    }
  }

  console.log(`✅ Extracted ${extractedTeams.length} teams locally`)
  return extractedTeams.length > 0 ? extractedTeams : null
}

// Export alias for backward compatibility
export const extractTeamsFromImage = extractTeamsFromText
