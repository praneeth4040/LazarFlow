import apiClient from './apiClient';

/**
 * Extract team names from text using AI backend
 * @param {string} text - Unstructured text containing team names
 * @returns {Promise<Array>} Array of team objects with name property
 */
export const extractTeamsFromText = async (text) => {
    console.log('🔍 Calling team extraction API...');

    try {
        const response = await apiClient.post('/extract-teams', { text });

        // Log the raw response for debugging
        console.log('🔍 Raw API Response:', response.data);

        const teams = response.data.teams || response.data;

        if (teams && Array.isArray(teams)) {
            console.log(`✅ API returned ${teams.length} teams`);

            // Map to consistent format { name: "Team Name", members: [] }
            return teams.map(team => {
                if (typeof team === 'string') {
                    return { name: team, members: [] };
                } else if (typeof team === 'object' && team !== null) {
                    return {
                        name: team.team_name || team.name || JSON.stringify(team),
                        members: []
                    };
                }
                return { name: String(team), members: [] };
            });
        } else {
            console.error('❌ Invalid response format:', response.data);
            throw new Error('Invalid response format: teams not found');
        }
    } catch (error) {
        console.error('❌ Error extracting teams:', error);
        throw error;
    }
};
