import apiClient from './apiClient';

/**
 * Extract lobby results from screenshots
 * @param {Array} imageFiles - Array of image objects (from expo-image-picker)
 * @param {Object} options - Extraction options
 * @returns {Promise<Array>} Extracted rank data
 */
export const extractResultsFromScreenshot = async (imageFiles, options = {}) => {
    console.log(`🔍 Extracting results from ${imageFiles.length} screenshots...`);

    // Create FormData for image upload
    const formData = new FormData();

    // Append all images
    imageFiles.forEach((image, index) => {
        const uri = image.uri;
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];

        formData.append('images', {
            uri,
            name: `image_${index}.${fileType}`,
            type: `image/${fileType}`,
        });
    });

    // Append options
    if (options.split !== undefined) formData.append('split', options.split);
    if (options.split_ratio !== undefined) formData.append('split_ratio', options.split_ratio);
    if (options.crop_top !== undefined) formData.append('crop_top', options.crop_top);
    if (options.crop_bottom !== undefined) formData.append('crop_bottom', options.crop_bottom);

    try {
        const response = await apiClient.post('/extract-results', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        console.log('🔍 Raw Result Extraction Response:', response.data);

        let results = [];

        if (response.data.teams && Array.isArray(response.data.teams)) {
            results = response.data.teams.map((team, index) => {
                const players = team.players || [];
                const teamKills = players.reduce((sum, p) => sum + (p.kills || 0), 0);

                const rankMatch = typeof team.position === 'string' && team.position.match(/#(\d+)/);
                const rank = rankMatch ? parseInt(rankMatch[1], 10) : (index + 1);

                return {
                    rank: rank,
                    team_name: `Team at #${rank}`,
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
                };
            });
        } else if (response.data.results && Array.isArray(response.data.results)) {
            results = response.data.results.map((r, i) => ({
                ...r,
                rank: r.rank || (i + 1)
            }));
        }

        if (results && results.length > 0) {
            console.log(`✅ Extracted ${results.length} ranks from screenshot`);
            return results;
        } else {
            throw new Error('No results found in API response');
        }
    } catch (error) {
        console.error('❌ Error extracting results:', error);
        throw error;
    }
};
