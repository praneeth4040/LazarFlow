/**
 * Export Handler Utility
 * Handles various export formats for tournament standings
 */

/**
 * Export rendered template as PNG
 * @param {Element} templateElement - The DOM element to export (SVG or Canvas)
 * @param {string} filename - Output filename
 * @returns {Promise<void>}
 */
export const exportAsPNG = async (templateElement, filename) => {
  try {
    // Import html2canvas dynamically
    const { default: html2canvas } = await import('html2canvas')

    // Create canvas from element
    const canvas = await html2canvas(templateElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true
    })

    // Create download link
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `${filename}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    console.log('✅ Exported as PNG:', filename)
  } catch (error) {
    console.error('❌ PNG export error:', error)
    throw new Error('Failed to export as PNG: ' + error.message)
  }
}

/**
 * Export as PDF
 * @param {Element} templateElement - The DOM element to export
 * @param {string} filename - Output filename
 * @param {Object} options - PDF options (orientation, format, etc)
 * @returns {Promise<void>}
 */
export const exportAsPDF = async (templateElement, filename, options = {}) => {
  try {
    // Import jsPDF and html2canvas
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')

    // Set default options
    const {
      orientation = 'landscape',
      format = 'a4'
    } = options

    // Create canvas
    const canvas = await html2canvas(templateElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true
    })

    const imgData = canvas.toDataURL('image/png')

    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format
    })

    // Get dimensions
    const imgWidth = pdf.internal.pageSize.getWidth()
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)

    // Download
    pdf.save(`${filename}.pdf`)

    console.log('✅ Exported as PDF:', filename)
  } catch (error) {
    console.error('❌ PDF export error:', error)
    throw new Error('Failed to export as PDF: ' + error.message)
  }
}

/**
 * Copy element to clipboard
 * @param {Element} templateElement - The DOM element to copy
 * @returns {Promise<void>}
 */
export const copyToClipboard = async (templateElement) => {
  try {
    // Create canvas
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(templateElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true
    })

    // Convert to blob
    canvas.toBlob(async (blob) => {
      try {
        // Copy to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ])
        console.log('✅ Copied to clipboard')
      } catch (err) {
        console.error('❌ Clipboard copy error:', err)
        throw new Error('Failed to copy to clipboard')
      }
    }, 'image/png')
  } catch (error) {
    console.error('❌ Clipboard error:', error)
    throw new Error('Failed to copy to clipboard: ' + error.message)
  }
}

/**
 * Generate shareable link
 * @param {string} tournamentId - Tournament ID
 * @param {string} templateId - Template ID
 * @returns {string} Shareable URL
 */
export const generateShareLink = (tournamentId, templateId = null) => {
  try {
    const baseUrl = window.location.origin
    const params = new URLSearchParams({
      tournament: tournamentId,
      ...(templateId && { template: templateId })
    })
    const shareUrl = `${baseUrl}?${params.toString()}`
    console.log('✅ Share link generated:', shareUrl)
    return shareUrl
  } catch (error) {
    console.error('❌ Share link error:', error)
    throw new Error('Failed to generate share link')
  }
}

/**
 * Copy share link to clipboard
 * @param {string} shareUrl - The URL to copy
 * @returns {Promise<void>}
 */
export const copyShareLink = async (shareUrl) => {
  try {
    await navigator.clipboard.writeText(shareUrl)
    console.log('✅ Share link copied to clipboard')
  } catch (error) {
    console.error('❌ Copy share link error:', error)
    throw new Error('Failed to copy share link: ' + error.message)
  }
}

/**
 * Share via social media
 * @param {string} platform - Platform (whatsapp, twitter, email, etc)
 * @param {string} shareUrl - URL to share
 * @param {Object} data - Share data (title, tournament name, etc)
 * @returns {void}
 */
export const shareViaSocial = (platform, shareUrl, data = {}) => {
  try {
    const {
      title = 'Check out this tournament',
      // tournamentName = 'Tournament',
      text = 'Check out this tournament standings!'
    } = data

    let url = ''

    switch (platform) {
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(`${text}\n${shareUrl}`)}`
        break

      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`
        break

      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        break

      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
        break

      case 'email':
        url = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${shareUrl}`)}`
        break

      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
        break

      default:
        throw new Error(`Unknown platform: ${platform}`)
    }

    if (platform === 'email') {
      window.location.href = url
    } else {
      window.open(url, '_blank', 'width=600,height=400')
    }

    console.log(`✅ Shared via ${platform}`)
  } catch (error) {
    console.error(`❌ Social share error (${platform}):`, error)
    throw new Error(`Failed to share via ${platform}: ` + error.message)
  }
}

/**
 * Download SVG as file
 * @param {string} svgContent - SVG content (text)
 * @param {string} filename - Output filename
 * @returns {void}
 */
export const downloadSVG = (svgContent, filename) => {
  try {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    console.log('✅ Downloaded SVG:', filename)
  } catch (error) {
    console.error('❌ SVG download error:', error)
    throw new Error('Failed to download SVG: ' + error.message)
  }
}

/**
 * Generate export filename with timestamp
 * @param {string} tournamentName - Tournament name
 * @param {string} format - File format (png, pdf, svg, etc)
 * @returns {string} Generated filename
 */
export const generateExportFilename = (tournamentName) => {
  try {
    // Remove special characters and spaces
    const cleanName = tournamentName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 50)

    // Add timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 12)

    return `${cleanName}_${timestamp}`
  } catch (error) {
    console.error('❌ Filename generation error:', error)
    return `tournament_${Date.now()}`
  }
}

export default {
  exportAsPNG,
  exportAsPDF,
  copyToClipboard,
  generateShareLink,
  copyShareLink,
  shareViaSocial,
  downloadSVG,
  generateExportFilename
}
