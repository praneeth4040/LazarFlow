import { supabase } from './supabaseClient';
import apiClient from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    if (url.includes('storage/v1/object/public/themes/')) {
        if (url.startsWith('http')) return { uri: url };
        const cleanStoragePath = url.startsWith('/') ? url.substring(1) : url;
        return { uri: `https://xsxwzwcfaflzynsyryzq.supabase.co/${cleanStoragePath}` };
    }

    // Construct URL for relative paths
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    
    // CRITICAL FIX: Handle optimized/ paths for null user_id themes
    if (cleanPath.startsWith('optimized/')) {
        return { uri: `https://xsxwzwcfaflzynsyryzq.supabase.co/storage/v1/object/public/themes/${cleanPath}` };
    }

    // Determine source based on properties
    if (theme.user_id || theme.is_user_theme) {
        return { uri: `https://xsxwzwcfaflzynsyryzq.supabase.co/storage/v1/object/public/themes/${cleanPath}` };
    }
    
    // Fallback for community API
    return { uri: `https://www.api.lazarflow.app/${cleanPath}` };
};

export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
};

/**
 * Fetch user profile from profiles table
 * @returns {Promise<Object|null>} User profile data
 */
export const getUserProfile = async () => {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }

    return data;
};

/**
 * Update user profile in profiles table
 * @param {Object} updates - Data to update
 * @returns {Promise<boolean>} Success status
 */
export const updateUserProfile = async (updates) => {
    const user = await getCurrentUser();
    if (!user) return false;

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

    if (error) {
        console.error('Error updating profile:', error);
        throw error;
    }

    return true;
};

export const getUserThemes = async (forceRefresh = false) => {
    const user = await getCurrentUser();
    if (!user) return [];

    if (!forceRefresh) {
        try {
            const cached = await AsyncStorage.getItem(`${CACHE_KEYS.USER_THEMES}_${user.id}`);
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

    const { data: themes, error } = await supabase
        .from('themes')
        .select('id, name, url, mapping_config, user_id, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching themes:', error);
        return [];
    }

    if (themes) {
        try {
            await AsyncStorage.setItem(
                `${CACHE_KEYS.USER_THEMES}_${user.id}`, 
                JSON.stringify({ data: themes, timestamp: Date.now() })
            );
        } catch (e) {
            console.error('Cache write error:', e);
        }
    }

    return themes || [];
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
        console.log('🎨 Fetching system themes (user_id IS NULL)...');
        
        const { data: themes, error } = await supabase
            .from('themes')
            .select('id, name, url, mapping_config, user_id, status, created_at')
            .is('user_id', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching community designs from Supabase:', error);
            return [];
        }
        
        const designs = themes || [];
        
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
 * Uploads a logo to the Supabase "logos" bucket and returns its public URL.
 * @param {string} uri - The local URI of the image to upload
 * @param {string} fileName - The desired file name
 * @returns {Promise<string|null>} The public URL of the uploaded image
 */
export const uploadLogo = async (uri, fileName) => {
    try {
        console.log(`📤 Uploading logo: ${fileName}...`);
        
        // Convert URI to Blob for upload
        const response = await fetch(uri);
        const blob = await response.blob();
        
        // Unique file name to avoid collisions
        const timestamp = Date.now();
        const fullPath = `${timestamp}_${fileName}`;
        
        const { data, error } = await supabase.storage
            .from('logos')
            .upload(fullPath, blob, {
                contentType: 'image/png',
                cacheControl: '3600',
                upsert: false
            });
            
        if (error) {
            console.error('❌ Error uploading logo:', error);
            throw error;
        }
        
        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
            .from('logos')
            .getPublicUrl(fullPath);
            
        console.log(`✅ Logo uploaded successfully: ${publicUrl}`);
        return publicUrl;
    } catch (error) {
        console.error('❌ Upload failed:', error);
        return null;
    }
};

/**
 * Render a lobby standings image using a specific theme
 * @param {string} lobbyId - The ID of the lobby
 * @param {string} themeId - The ID of the theme to use
 * @param {Object} overrides - Design overrides (logos, text, etc.)
 * @returns {Promise<Object>} The rendered image data (url or base64)
 */
export const renderLobbyDesign = async (lobbyId, themeId, overrides = null) => {
    try {
        console.log(`🎨 Requesting render for lobby ${lobbyId} with theme ${themeId}...`);
        if (overrides) {
            console.log('📝 Applying overrides:', JSON.stringify(overrides, null, 2));
        }
        
        // The endpoint returns a binary image (PNG)
        const response = await apiClient.post(`/render/${lobbyId}/${themeId}`, overrides, {
            responseType: 'arraybuffer',
            headers: {
                'Accept': 'image/png, application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`📡 Response Status: ${response.status}`);
        console.log(`📡 Content-Type: ${response.headers['content-type']}`);
        
        if (response.data) {
            const contentType = response.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
                // If it's JSON, decode the arraybuffer
                const decoder = new TextDecoder('utf-8');
                const jsonString = decoder.decode(response.data);
                console.log('📄 Received JSON Response:', jsonString);
                return JSON.parse(jsonString);
            } else {
                console.log(`✅ Received Binary Data. Size: ${response.data.byteLength} bytes`);
                return response.data;
            }
        }
        
        return null;
    } catch (error) {
        if (error.response && error.response.data instanceof ArrayBuffer) {
            const decoder = new TextDecoder('utf-8');
            const errorString = decoder.decode(error.response.data);
            console.error('❌ Server Error Details (JSON):', errorString);
        } else {
            console.error('❌ Error rendering design:', error);
        }
        throw error;
    }
};

/**
 * Render a lobby standings results image using a specific theme (New Design System)
 * @param {string} lobbyId - The ID of the lobby
 * @param {string} themeId - The ID of the theme to use
 * @returns {Promise<Object>} The rendered image data
 */
export const renderResults = async (lobbyId, themeId) => {
    try {
        console.log(`🚀 Requesting render-results for lobby ${lobbyId} with theme ${themeId}...`);
        
        const response = await apiClient.post(`/render-results`, {
            lobbyId: lobbyId,
            themesId: themeId
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
