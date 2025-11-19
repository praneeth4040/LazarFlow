// Client-side Team Extraction Logic
// Replaces the previous Server API call with local processing

export const extractTeamsFromText = async (text) => {
  console.log('🔍 Extracting teams locally...')

  // Simulate async delay for better UX (optional, but keeps interface consistent)
  await new Promise(resolve => setTimeout(resolve, 500))

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
      trimmed.match(/^\d{1,2}[:\/]\d{1,2}/) || // Skip times and dates (from Server logic)
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
    // Merged logic: added !trimmed.match(/^\d/) from Server
    if (trimmed.length > 2 && trimmed.length < 100 && !trimmed.match(/^\d/)) {
      extractedTeams.push({ name: trimmed })
    }
  }

  console.log(`✅ Extracted ${extractedTeams.length} teams`)
  return extractedTeams.length > 0 ? extractedTeams : null
}

// Export alias for backward compatibility if needed, though we updated the main function
export const extractTeamsLocally = extractTeamsFromText
export const extractTeamsFromImage = extractTeamsFromText

