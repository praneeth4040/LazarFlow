import apiClient from './api'

// AI Team Extraction API
export const extractTeamsFromText = async (text) => {
  try {
    console.log('📤 Sending request to AI extraction API...')
    
    // Call the backend API endpoint
    const response = await apiClient.post('/ai/extract-teams', {
      text: text,
      language: 'en'
    })

    console.log('✅ API Response:', response.data)

    if (response.data.teams && Array.isArray(response.data.teams)) {
      return response.data.teams.map(team => ({ name: team }))
    }

    return null
  } catch (err) {
    console.error('❌ API Error:', err)
    return null
  }
}

// Fallback local extraction (used when API is unavailable)
export const extractTeamsLocally = (text) => {
  console.log('🔍 Using local extraction method...')
  
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

    // Add valid team names
    if (trimmed && trimmed.length > 0 && trimmed.length < 100) {
      extractedTeams.push({ name: trimmed })
    }
  }

  return extractedTeams.length > 0 ? extractedTeams : null
}
