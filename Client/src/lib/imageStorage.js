import { supabase } from './supabaseClient'

const STORAGE_BUCKET = 'gameResults'

/**
 * Sanitize a string to be safe for use in file paths
 * Removes special characters and spaces
 */
const sanitizeForPath = (str) => {
    if (!str) return 'unknown'
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
        .replace(/_+/g, '_') // Replace multiple underscores with single
        .replace(/^_|_$/g, '') // Remove leading/trailing underscores
}

/**
 * Get the next available image number for a tournament
 * @param {string} userEmail - User's email address
 * @param {string} tournamentName - Tournament name
 * @returns {Promise<number>} Next available image number
 */
export const getNextImageNumber = async (userEmail, tournamentName) => {
    try {
        const userName = sanitizeForPath(userEmail)
        const sanitizedTournament = sanitizeForPath(tournamentName)
        const folderPath = `${userName}/${sanitizedTournament}`

        // List all files in the folder
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .list(folderPath)

        if (error) {
            // If folder doesn't exist, start from 1
            if (error.message.includes('Not found') || error.message.includes('not found')) {
                return 1
            }
            throw error
        }

        if (!data || data.length === 0) {
            return 1
        }

        // Extract image numbers from filenames (e.g., image1.png -> 1)
        const imageNumbers = data
            .map(file => {
                const match = file.name.match(/^image(\d+)\./i)
                return match ? parseInt(match[1], 10) : 0
            })
            .filter(num => num > 0)

        // Return the next number (max + 1)
        return imageNumbers.length > 0 ? Math.max(...imageNumbers) + 1 : 1
    } catch (error) {
        console.error('Error getting next image number:', error)
        // On error, start from timestamp to avoid conflicts
        return Date.now()
    }
}

/**
 * Upload game result images to Supabase storage
 * @param {File[]} imageFiles - Array of image files to upload
 * @param {string} userEmail - User's email address
 * @param {string} tournamentName - Tournament name
 * @returns {Promise<string[]>} Array of uploaded file paths
 */
export const uploadGameResultImages = async (imageFiles, userEmail, tournamentName) => {
    if (!imageFiles || imageFiles.length === 0) {
        throw new Error('No image files provided')
    }

    if (!userEmail || !tournamentName) {
        throw new Error('User email and tournament name are required')
    }

    const userName = sanitizeForPath(userEmail)
    const sanitizedTournament = sanitizeForPath(tournamentName)

    try {
        // Get the starting image number
        let imageNumber = await getNextImageNumber(userEmail, tournamentName)

        const uploadedPaths = []

        // Upload each image
        for (const imageFile of imageFiles) {
            // Get file extension
            const fileExtension = imageFile.name.split('.').pop() || 'png'

            // Build the file path
            const filePath = `${userName}/${sanitizedTournament}/image${imageNumber}.${fileExtension}`

            console.log(`📤 Uploading image to: ${filePath}`)

            // Upload to Supabase storage
            const { data, error } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(filePath, imageFile, {
                    cacheControl: '3600',
                    upsert: false // Don't overwrite existing files
                })

            if (error) {
                console.error(`❌ Error uploading ${filePath}:`, error)
                throw error
            }

            console.log(`✅ Uploaded: ${filePath}`)
            uploadedPaths.push(data.path)
            imageNumber++
        }

        return uploadedPaths
    } catch (error) {
        console.error('❌ Error uploading images to Supabase:', error)
        throw new Error(`Failed to upload images: ${error.message}`)
    }
}

/**
 * Delete game result images for a tournament (optional cleanup)
 * @param {string} userEmail - User's email address
 * @param {string} tournamentName - Tournament name
 * @returns {Promise<void>}
 */
export const deleteGameResultImages = async (userEmail, tournamentName) => {
    const userName = sanitizeForPath(userEmail)
    const sanitizedTournament = sanitizeForPath(tournamentName)
    const folderPath = `${userName}/${sanitizedTournament}`

    try {
        // List all files in the folder
        const { data: files, error: listError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .list(folderPath)

        if (listError) throw listError

        if (!files || files.length === 0) {
            console.log('No images to delete')
            return
        }

        // Build full paths for deletion
        const filePaths = files.map(file => `${folderPath}/${file.name}`)

        // Delete all files
        const { error: deleteError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .remove(filePaths)

        if (deleteError) throw deleteError

        console.log(`✅ Deleted ${files.length} images from ${folderPath}`)
    } catch (error) {
        console.error('❌ Error deleting images:', error)
        throw new Error(`Failed to delete images: ${error.message}`)
    }
}

/**
 * Get public URL for a stored image
 * @param {string} filePath - Path to the file in storage
 * @returns {string} Public URL
 */
export const getImagePublicUrl = (filePath) => {
    const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath)

    return data.publicUrl
}

export default {
    uploadGameResultImages,
    getNextImageNumber,
    deleteGameResultImages,
    getImagePublicUrl
}
