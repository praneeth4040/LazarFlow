import apiClient from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from './authService';

const CACHE_KEYS = {
    COMMUNITY_DESIGNS: 'cache_community_designs',
    USER_THEMES: 'cache_user_themes'
};

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Resolves a design theme object into a valid image source for React Native's Image component.
 * @param {Object} theme - The theme object
 * @returns {Object|null} - An object with { uri: string } or null
 */
export const getDesignImageSource = (theme) => {
    if (!theme) return null;
    
    const themeUrl = theme.url || theme.image || theme.design_url || theme.path || theme.imageUrl || theme.thumbnail || theme.preview_url || theme.preview || theme.mapping_config?.optimized_base_url;
    if (!themeUrl) return null;

    // Clean the URL
    const url = String(themeUrl).replace(/`/g, '').trim();

    // If it's already a full URL (non-Supabase or already absolute), return it
    if (url.startsWith('http') && !url.includes('storage/v1/object/public/themes/')) {
        return { uri: url };
    }

    // Check if it's already a Supabase storage path or relative path
    // Keeping this for backward compatibility if backend returns supabase URLs
    if (url.includes('storage/v1/object/public/themes/')) {
        if (url.startsWith('http')) return { uri: url };
        const cleanStoragePath = url.startsWith('/') ? url.substring(1) : url;
        return { uri: `https://xsxwzwcfaflzynsyryzq.supabase.co/${cleanStoragePath}` };
    }

    // Construct URL for relative paths - pointing to new backend or existing CDN logic
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    
    if (cleanPath.startsWith('optimized/')) {
        // Fallback to supabase for old assets if needed, or point to new API
        // For now, assuming new API handles serving or returns full URLs
        return { uri: `https://www.api.lazarflow.app/storage/themes/${cleanPath}` }; 
    }

    if (theme.user_id || theme.is_user_theme) {
         return { uri: `https://www.api.lazarflow.app/storage/themes/${cleanPath}` };
    }
    
    return { uri: `https://www.api.lazarflow.app/storage/${cleanPath}` };
};

/**
 * Update user profile
 * @param {Object} updates - Data to update (only expo_push_token supported)
 * @returns {Promise<boolean>} Success status
 */
export const registerPushToken = async (userId, token) => {
    try {
        const payload = { 
            user_id: userId, 
            token: token 
        };
        const response = await apiClient.post('/api/notifications/register-token', payload);
        console.log('Push token registration response:', response.data);
        return true;
    } catch (error) {
        console.error('Error registering push token:', error);
        throw error;
    }
};

export const getUserThemes = async (userId, forceRefresh = false) => {
    if (!userId) return [];

    if (!forceRefresh) {
        try {
            const cached = await AsyncStorage.getItem(`${CACHE_KEYS.USER_THEMES}_${userId}`);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_EXPIRY) {
                    console.log('📦 Returning cached user themes');
                    return data;
                }
            }
        } catch (e) {
            console.error('Cache read error:', e);
        }
    }

    try {
        console.log('🔍 Fetching user themes...');
        const { data: themes } = await apiClient.get('/api/themes');
        console.log(`📦 Fetched ${themes?.length || 0} total themes from server`);
        
        const userThemes = themes ? themes.filter(t => t.user_id === userId) : [];
        console.log(`👤 Found ${userThemes.length} themes for user ${userId}`);

        if (userThemes.length > 0) {
            try {
                await AsyncStorage.setItem(
                    `${CACHE_KEYS.USER_THEMES}_${userId}`, 
                    JSON.stringify({ data: userThemes, timestamp: Date.now() })
                );
            } catch (e) {
                console.error('Cache write error:', e);
            }
        }

        return userThemes;
    } catch (error) {
        console.error('Error fetching themes:', error);
        return [];
    }
};

/**
 * Fetch available design themes from the community (API)
 * @returns {Promise<Array>} List of design themes
 */
export const getCommunityDesigns = async (forceRefresh = false) => {
    if (!forceRefresh) {
        try {
            const cached = await AsyncStorage.getItem(CACHE_KEYS.COMMUNITY_DESIGNS);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_EXPIRY) {
                    console.log('📦 Returning cached community designs');
                    return data;
                }
            }
        } catch (e) {
            console.error('Cache read error:', e);
        }
    }

    try {
        console.log('🎨 Fetching system themes from /api/themes...');
        
        const { data: themes } = await apiClient.get('/api/themes');
        console.log(`📦 Fetched ${themes?.length || 0} total themes for community check`);
        
        // Filter for system themes (user_id is null)
        const designs = themes ? themes.filter(t => !t.user_id) : [];
        console.log(`🌐 Found ${designs.length} system themes`);
        
        if (designs.length > 0) {
            console.log(`✅ Found ${designs.length} system themes`);
            try {
                await AsyncStorage.setItem(
                    CACHE_KEYS.COMMUNITY_DESIGNS, 
                    JSON.stringify({ data: designs, timestamp: Date.now() })
                );
            } catch (e) {
                console.error('Cache write error:', e);
            }
        }
        
        return designs;
    } catch (error) {
        console.error('❌ Error in getCommunityDesigns:', error);
        return [];
    }
};

/**
 * Uploads a logo to the backend
 * @param {string} uri - The local URI of the image to upload
 * @param {string} fileName - The desired file name
 * @returns {Promise<string|null>} The public URL of the uploaded image
 */
export const uploadLogo = async (uri, fileName) => {
    try {
        console.log(`📤 Uploading logo: ${fileName}...`);
        
        const formData = new FormData();
        formData.append('file', {
            uri,
            name: fileName,
            type: 'image/png',
        });
        
        const { data } = await apiClient.post('/api/storage/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
            
        console.log(`✅ Logo uploaded successfully: ${data.url}`);
        return data.url;
    } catch (error) {
        console.error('❌ Upload failed:', error);
        return null;
    }
};

export const createTheme = async (themeData) => {
    const { data } = await apiClient.post('/api/themes', themeData);
    return data;
};

/**
 * Render a lobby standings image using a specific theme
 */
export const renderLobbyDesign = async (lobbyId, themeId, overrides = null) => {
    try {
        console.log(`🎨 Requesting render for lobby ${lobbyId} with theme ${themeId}...`);
        
        const response = await apiClient.post(`/render/${lobbyId}/${themeId}`, overrides, {
            responseType: 'arraybuffer',
            headers: {
                'Accept': 'image/png, application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data) {
            const contentType = response.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
                const decoder = new TextDecoder('utf-8');
                const jsonString = decoder.decode(response.data);
                return JSON.parse(jsonString);
            } else {
                return response.data;
            }
        }
        
        return null;
    } catch (error) {
        console.error('❌ Error rendering design:', error);
        throw error;
    }
};

/**
 * Render a lobby standings results image using a specific theme
 */
export const renderResults = async (lobbyId, themeId) => {
    try {
        console.log('🖼️ Requesting Results Render:', { lobbyId, themeId });
        const response = await apiClient.post(`/api/render/render-results`, {
            lobbyId: lobbyId,
            themeId: themeId
        }, {
            responseType: 'arraybuffer',
            headers: {
                'Accept': 'image/png, application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data) {
            const contentType = response.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
                const decoder = new TextDecoder('utf-8');
                const jsonString = decoder.decode(response.data);
                return JSON.parse(jsonString);
            } else {
                return response.data;
            }
        }
        return null;
    } catch (error) {
        console.error('❌ Error in renderResults:', error);
        throw error;
    }
};

// --- New Services for Lobbies and Teams ---

export const getLobbies = async () => {
    const { data } = await apiClient.get('/api/lobbies');
    return data;
};

export const getLobby = async (id) => {
    const { data } = await apiClient.get(`/api/lobbies/${id}`);
    return data;
};

export const getLobbyByShareId = async (shareId) => {
    const { data } = await apiClient.get(`/api/lobbies/public/${shareId}`);
    return data;
};

export const createLobby = async (lobbyData) => {
    const { data } = await apiClient.post('/api/lobbies', lobbyData);
    return data;
};

export const updateLobby = async (id, updates) => {
    const { data } = await apiClient.put(`/api/lobbies/${id}`, updates);
    return data;
};

export const endLobby = async (id) => {
    const { data } = await apiClient.put(`/api/lobbies/${id}/end`);
    return data;
};

export const deleteLobby = async (id) => {
    await apiClient.delete(`/api/lobbies/${id}`);
};

export const getLobbyTeams = async (lobbyId) => {
    const { data } = await apiClient.get(`/api/lobbies/${lobbyId}/teams`);
    return data;
};

export const addLobbyTeams = async (lobbyId, teams) => {
    const { data } = await apiClient.post(`/api/lobbies/${lobbyId}/teams`, teams);
    return data;
};

export const updateTeam = async (teamId, updates) => {
    const { data } = await apiClient.put(`/api/teams/${teamId}`, updates);
    return data;
};

export const batchUpdateTeams = async (lobbyId, updates) => {
    const { data } = await apiClient.put(`/api/lobbies/${lobbyId}/teams/batch`, updates);
    return data;
};

export const batchUpdateTeamMembers = async (lobbyId, updates) => {
    const { data } = await apiClient.put(`/api/lobbies/${lobbyId}/teams/members/batch`, updates);
    return data;
};

export const deleteTeam = async (teamId) => {
    await apiClient.delete(`/api/teams/${teamId}`);
};

// --- New Theme Management Endpoints ---

/**
 * Get all themes (user + system) with optional status filter
 * Endpoint: GET /api/themes
 */
export const fetchThemes = async (status = null) => {
    const params = status ? { status } : {};
    const { data } = await apiClient.get('/api/themes', { params });
    return data;
};

/**
 * Upload/Create a new theme
 * Endpoint: POST /api/themes
 * Content-Type: multipart/form-data
 */
export const uploadTheme = async (name, imageUri) => {
    const formData = new FormData();
    formData.append('name', name);
    
    // Append image file
    // React Native expects: { uri, name, type }
    const fileName = imageUri.split('/').pop() || 'theme.png';
    const match = /\.(\w+)$/.exec(fileName);
    const type = match ? `image/${match[1]}` : 'image/png';
    
    formData.append('image', {
        uri: imageUri,
        name: fileName,
        type: type,
    });

    const { data } = await apiClient.post('/api/themes', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return data;
};

/**
 * Update Theme Name
 * Endpoint: PUT /api/themes/<id>
 */
export const updateThemeName = async (id, name) => {
    const { data } = await apiClient.put(`/api/themes/${id}`, { name });
    return data;
};

/**
 * Update Config & Status
 * Endpoint: PUT /api/themes/<id>/config
 */
export const updateThemeConfig = async (id, status, mappingConfig) => {
    const body = {};
    if (status) body.status = status;
    if (mappingConfig) body.mapping_config = mappingConfig;

    const { data } = await apiClient.put(`/api/themes/${id}/config`, body);
    return data;
};

/**
 * Delete Theme
 * Endpoint: DELETE /api/themes/<id>
 */
export const deleteTheme = async (id) => {
    const { data } = await apiClient.delete(`/api/themes/${id}`);
    return data;
};
