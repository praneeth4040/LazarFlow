import apiClient, { BASE_URL } from './apiClient';

/**
 * Process lobby screenshots to extract teams and members
 * @param {Array} imageFiles - Array of image objects
 * @param {string} lobbyId - The ID of the lobby
 * @returns {Promise<Object>} Processed lobby data
 */
export const processLobbyScreenshots = async (imageFiles, lobbyId) => {
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
        const response = await apiClient.post('/api/ai/process-lobby-v3', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    } catch (error) {
        console.error('❌ Error processing lobby:', error);
        throw error;
    }
};

/**
 * Extract lobby results from screenshots using extract-results-v3
 * @param {Array} imageFiles - Array of image objects (from expo-image-picker)
 * @param {Object} options - Extraction options (model, provider, split, etc.)
 * @param {string} lobbyId - The ID of the lobby
 * @returns {Promise<Array>} Extracted rank data
 */
export const extractResultsFromScreenshot = async (imageFiles, options = {}, lobbyId) => {
    // Create FormData for image upload
    const formData = new FormData();
    
    // Add lobby_id to form data if provided
    const targetLobbyId = lobbyId || options.lobbyId || options.lobby_id;
    if (targetLobbyId) {
        formData.append('lobby_id', targetLobbyId);
    }

    if (options.model) {
        formData.append('model', options.model);
    } else {
        formData.append('model', 'qwen/qwen3.7-flash');
    }

    if (options.provider) {
        formData.append('provider', options.provider);
    }

    // Append all images
    imageFiles.forEach((image, index) => {
        const uri = image.uri;
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1] || 'jpg';

        formData.append('images', {
            uri,
            name: `image_${index}.${fileType}`,
            type: `image/${fileType}`,
        });
    });

    // Build query string for options if present
    const queryParams = [];
    if (options.split !== undefined) queryParams.push(`split=${options.split}`);
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    try {
        // Send request to extract-results-v3 endpoint
        const response = await apiClient.post(`/api/ai/extract-results-v3${queryString}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

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
                    })),
                    verification_urls: (() => {
                        const rawUrls = team.verification_urls || (team.verification_url ? [team.verification_url] : []);
                        const urlArray = Array.isArray(rawUrls) ? rawUrls : [rawUrls];
                        return urlArray
                            .map(url => String(url).replace(/`/g, '').trim())
                            .filter(url => !!url)
                            .map(url => {
                                 // If it's a relative path, prepend BASE_URL
                                 if (url.startsWith('/') && !url.startsWith('http')) {
                                     return `${BASE_URL}${url}`;
                                 }
                                 return url;
                             });
                    })(),
                    cell_request_id: data.cell_request_id || team.cell_request_id
                };
            });
        }

        return results;
    } catch (error) {
        console.error('❌ Error extracting results (v3):', error);
        throw error;
    }
};

export const extractResultsV3 = extractResultsFromScreenshot;
