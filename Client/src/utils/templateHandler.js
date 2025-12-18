/**
 * Template Handler Utility
 * Core functions for processing SVG/PNG templates and injecting tournament data
 */

// Constants
// const SUPPORTED_FORMATS = ['svg', 'png', 'jpg', 'jpeg', 'webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_EXTENSIONS = ['svg', 'png', 'jpg', 'jpeg', 'webp']

/**
 * Validate template file before upload
 * @param {File} file - File object to validate
 * @returns {Object} Validation result { valid: bool, error: string, format: string, isVector: bool, isRaster: bool }
 */
export const validateTemplateFile = (file) => {
  try {
    if (!file) {
      return { valid: false, error: 'No file provided' }
    }

    // Check file extension
    const ext = file.name.split('.').pop().toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `Invalid format: .${ext}. Supported: ${ALLOWED_EXTENSIONS.join(', ')}`
      }
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(1)
      return {
        valid: false,
        error: `File too large. Max ${sizeMB}MB, your file is ${(file.size / 1024 / 1024).toFixed(1)}MB`
      }
    }

    // Check MIME type
    const validMimes = [
      'image/svg+xml',
      'image/png',
      'image/jpeg',
      'image/webp'
    ]
    if (!validMimes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid MIME type: ${file.type}. Supported: SVG, PNG, JPG, WebP`
      }
    }

    return {
      valid: true,
      format: ext,
      isVector: ext === 'svg',
      isRaster: ext !== 'svg'
    }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

/**
 * Replace SVG text placeholders with tournament data
 * @param {string} svgContent - SVG file content
 * @param {Object} data - Data object with tournament info
 * @returns {string} Modified SVG content
 */
export const replaceSVGPlaceholders = (svgContent, data) => {
  try {
    let modified = svgContent

    // Replace all known placeholders
    const placeholders = {
      '{TOURNAMENT_NAME}': data.tournamentName || '',
      '{ORGANIZER}': data.organizer || '',
      '{EVENT_NAME}': data.eventName || '',
      '{DATE}': data.date || '',
      '{GAME_TYPE}': data.gameType || '',
    }

    for (const [placeholder, value] of Object.entries(placeholders)) {
      modified = modified.replaceAll(placeholder, value)
    }

    return modified
  } catch (error) {
    console.error('Error replacing SVG placeholders:', error)
    return svgContent
  }
}

/**
 * Inject team standings data into SVG template
 * @param {string} svgContent - SVG file content
 * @param {Array} standings - Array of team standings
 * @returns {string} Modified SVG with team data
 */
export const replaceSVGTeamData = (svgContent, standings) => {
  try {
    let modified = svgContent

    // Replace team row template if it exists
    const teamRowRegex = /<!--\s*TEAM_ROW_START\s*-->([\s\S]*?)<!--\s*TEAM_ROW_END\s*-->/
    const match = modified.match(teamRowRegex)

    if (match) {
      const template = match[1]
      let teamRows = ''

      standings.forEach((team) => {
        let row = template
        row = row.replaceAll('{RANK}', team.rank)
        row = row.replaceAll('{TEAM_NAME}', team.name)
        row = row.replaceAll('{WINS}', team.wins || 0)
        row = row.replaceAll('{PP}', team.placementPoints || 0)
        row = row.replaceAll('{KP}', team.killPoints || 0)
        row = row.replaceAll('{TP}', team.totalPoints || 0)
        teamRows += row
      })

      modified = modified.replace(teamRowRegex, teamRows)
    }

    return modified
  } catch (error) {
    console.error('Error replacing team data in SVG:', error)
    return svgContent
  }
}

/**
 * Draw tournament data onto canvas (for PNG/JPG images)
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} data - Data object with tournament and standings info
 * @param {Object} config - Configuration for drawing (fontSize, fontFamily, colors, etc)
 */
export const drawDataOnCanvas = (ctx, data, config = {}) => {
  try {
    const {
      startY = 50,
      lineHeight = 40,
      fontSize = 16,
      fontFamily = 'Arial, sans-serif',
      textColor = '#ffffff',
      shadowColor = 'rgba(0, 0, 0, 0.5)',
      maxWidth = 800
    } = config

    ctx.font = `${fontSize}px ${fontFamily}`
    ctx.fillStyle = textColor
    ctx.shadowColor = shadowColor
    ctx.shadowBlur = 3
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 1

    let currentY = startY

    // Draw tournament header
    ctx.font = `bold ${fontSize + 4}px ${fontFamily}`
    ctx.fillText(data.tournamentName || 'Tournament', 30, currentY)
    currentY += lineHeight + 10

    // Draw column headers
    ctx.font = `bold ${fontSize}px ${fontFamily}`
    const headers = ['Rank', 'Team Name', 'Wins', 'PP', 'KP', 'TP']
    const columnWidth = (maxWidth - 60) / headers.length
    headers.forEach((header, i) => {
      ctx.fillText(header, 30 + i * columnWidth, currentY)
    })
    currentY += lineHeight

    // Draw separator
    ctx.fillRect(30, currentY - 5, maxWidth - 60, 1)
    currentY += 10

    // Draw standings
    ctx.font = `${fontSize}px ${fontFamily}`
    if (data.standings && Array.isArray(data.standings)) {
      data.standings.slice(0, 10).forEach((team) => {
        ctx.fillText(`${team.rank || '-'}`, 30, currentY)
        ctx.fillText(team.name || '', 30 + columnWidth, currentY)
        ctx.fillText(`${team.wins || 0}`, 30 + columnWidth * 2, currentY)
        ctx.fillText(`${team.placementPoints || 0}`, 30 + columnWidth * 3, currentY)
        ctx.fillText(`${team.killPoints || 0}`, 30 + columnWidth * 4, currentY)
        ctx.fillText(`${team.totalPoints || 0}`, 30 + columnWidth * 5, currentY)
        currentY += lineHeight
      })
    }
  } catch (error) {
    console.error('Error drawing data on canvas:', error)
  }
}

/**
 * Compress image before upload
 * @param {File} file - Image file to compress
 * @param {number} quality - Quality level 0-1 (default 0.85)
 * @param {number} scale - Scale factor 0-1 (default 0.8)
 * @returns {Promise<Blob>} Compressed image blob
 */
export const compressImage = async (file, quality = 0.85, scale = 0.8) => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader()

      reader.onload = (event) => {
        const img = new Image()

        img.onload = () => {
          // Create canvas
          const canvas = document.createElement('canvas')
          const newWidth = img.width * scale
          const newHeight = img.height * scale

          canvas.width = newWidth
          canvas.height = newHeight

          // Draw and compress
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, newWidth, newHeight)

          canvas.toBlob(resolve, 'image/png', quality)
        }

        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = event.target.result
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    } catch (error) {
      reject(error)
    }
  })
}

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

    // Process teams to calculate total points
    const processedTeams = teams.map(team => {
      // Handle total_points as object or number
      let totalPoints = 0
      let killPoints = 0
      let placementPoints = 0
      let wins = 0
      let matchesPlayed = 0

      if (typeof team.total_points === 'object' && team.total_points !== null) {
        // total_points is a JSON object
        killPoints = team.total_points.kill_points || 0
        placementPoints = team.total_points.placement_points || 0
        wins = team.total_points.wins || 0
        matchesPlayed = team.total_points.matches_played || 0
        totalPoints = killPoints + placementPoints
      } else if (typeof team.total_points === 'number') {
        // total_points is already a number
        totalPoints = team.total_points
        killPoints = team.kill_points || team.points?.kill_points || 0
        placementPoints = team.placement_points || team.points?.placement_points || 0
        wins = team.wins || team.points?.wins || 0
        matchesPlayed = team.matches_played || team.points?.matches_played || 0
      } else {
        // Fallback: use individual fields
        killPoints = team.kill_points || team.points?.kill_points || 0
        placementPoints = team.placement_points || team.points?.placement_points || 0
        wins = team.wins || team.points?.wins || 0
        matchesPlayed = team.matches_played || team.points?.matches_played || 0
        totalPoints = killPoints + placementPoints
      }

      return {
        ...team,
        totalPoints,
        killPoints,
        placementPoints,
        wins,
        matchesPlayed
      }
    })

    // Sort by total points descending
    const sorted = processedTeams.sort((a, b) => b.totalPoints - a.totalPoints)

    // Add rankings
    return sorted.map((team, index) => ({
      rank: index + 1,
      name: team.team_name || team.name || 'Unknown Team',
      wins: team.wins,
      placementPoints: team.placementPoints,
      killPoints: team.killPoints,
      totalPoints: team.totalPoints,
      matchesPlayed: team.matchesPlayed
    }))
  } catch (error) {
    console.error('Error calculating standings:', error)
    return []
  }
}

/**
 * Format tournament data for template injection
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

/**
 * Extract SVG placeholders to see what template supports
 * @param {string} svgContent - SVG file content
 * @returns {Array} Array of placeholder strings found
 */
export const extractSVGPlaceholders = (svgContent) => {
  try {
    const placeholderRegex = /\{[A-Z_]+\}/g
    const matches = svgContent.match(placeholderRegex) || []
    return [...new Set(matches)] // Remove duplicates
  } catch (error) {
    console.error('Error extracting SVG placeholders:', error)
    return []
  }
}

/**
 * Check if SVG has team row template
 * @param {string} svgContent - SVG file content
 * @returns {boolean} True if team row template found
 */
export const hasSVGTeamTemplate = (svgContent) => {
  try {
    return /<!--\s*TEAM_ROW_START\s*-->/i.test(svgContent)
  } catch (error) {
    console.error('Error checking for team template:', error)
    return false
  }
}

/**
 * Generate export filename with timestamp
 * @param {string} tournamentName - Tournament name
 * @param {string} format - File format (png, pdf, svg, etc)
 * @returns {string} Generated filename
 */
export const generateExportFilename = (tournamentName, format = 'png') => {
  try {
    const cleanName = tournamentName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 50)

    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 12)

    return `${cleanName}_${timestamp}.${format}`
  } catch (error) {
    console.error('Error generating filename:', error)
    return `tournament_${Date.now()}.${format}`
  }
}

/**
 * Get MIME type for file format
 * @param {string} format - File format (svg, png, jpg, etc)
 * @returns {string} MIME type
 */
export const getMimeType = (format) => {
  const mimeTypes = {
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp'
  }
  return mimeTypes[format?.toLowerCase()] || 'application/octet-stream'
}

export default {
  validateTemplateFile,
  replaceSVGPlaceholders,
  replaceSVGTeamData,
  drawDataOnCanvas,
  compressImage,
  calculateStandings,
  formatTournamentData,
  extractSVGPlaceholders,
  hasSVGTeamTemplate,
  generateExportFilename,
  getMimeType
}
