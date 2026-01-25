import apiClient from './apiClient';

/**
 * Process lobby screenshots to extract teams and members
 * @param {Array} imageFiles - Array of image objects
 * @param {string} lobbyId - The ID of the lobby
 * @returns {Promise<Object>} Processed lobby data
 */
export const processLobbyScreenshots = async (imageFiles, lobbyId) => {
    console.log(`🔍 Processing ${imageFiles.length} lobby screenshots for lobby ${lobbyId}...`);

    const formData = new FormData();
    
    // Add lobby_id to form data
    if (lobbyId) {
        formData.append('lobby_id', lobbyId);
    }

    imageFiles.forEach((image, index) => {
        const uri = image.uri;
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];

        formData.append('images', {
            uri,
            name: `lobby_${index}.${fileType}`,
            type: `image/${fileType}`,
        });
    });

    try {
        const response = await apiClient.post('/api/ai/process-lobby', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        console.log('🔍 Lobby Processing Response:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Error processing lobby:', error);
        throw error;
    }
};

/**
 * Extract lobby results from screenshots
 * @param {Array} imageFiles - Array of image objects (from expo-image-picker)
 * @param {Object} options - Extraction options
 * @returns {Promise<Array>} Extracted rank data
 */
export const extractResultsFromScreenshot = async (imageFiles, options = {}, lobbyId) => {
    console.log(`🔍 Extracting results from ${imageFiles.length} screenshots...`);

    // Create FormData for image upload
    const formData = new FormData();
    
    // Add lobby_id to form data if provided
    if (lobbyId) {
        formData.append('lobby_id', lobbyId);
    } else if (options.lobbyId) {
        // Fallback to options if passed there
        formData.append('lobby_id', options.lobbyId);
    }

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

    // Build query string for options
    const queryParams = [];
    if (options.split !== undefined) queryParams.push(`split=${options.split}`);
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    try {
        // Send request with query parameters
        const response = await apiClient.post(`/api/ai/extract-results${queryString}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        console.log('🔍 Raw Result Extraction Response:', response.data);

        let results = [];
        const data = response.data;

        // Handle the "teams" wrapper in the response
        const rawTeams = data.teams || (Array.isArray(data) ? data : (data.results || []));

        if (Array.isArray(rawTeams)) {
            results = rawTeams.map((team, index) => {
                const players = team.players || [];
                // If team kills are not explicitly provided, sum player kills
                const teamKills = team.kills !== undefined ? team.kills : players.reduce((sum, p) => sum + (p.kills || 0), 0);

                // Ensure rank is a number
                let rank = index + 1;
                if (team.position) {
                    // Handle "1", "#1", "Rank 1"
                    const rankNum = parseInt(String(team.position).replace(/[^0-9]/g, ''), 10);
                    if (!isNaN(rankNum)) {
                        rank = rankNum;
                    }
                } else if (team.rank) {
                    rank = team.rank;
                }

                // Construct a team name if not provided (e.g., from first player)
                const teamName = team.team_name || team.name || (players.length > 0 ? players[0].name + "'s Team" : `Team #${rank}`);

                return {
                    rank: rank,
                    team_name: teamName,
                    kills: teamKills,
                    players: players.map(p => ({
                        name: p.name,
                        kills: parseInt(p.kills || 0, 10)
                    }))
                };
            });
        }

        console.log(`✅ Extracted ${results.length} result entries`);
        return results;
    } catch (error) {
        console.error('❌ Error extracting results:', error);
        throw error;
    }
};
