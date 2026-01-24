import React, { useMemo } from 'react';
import { View, Text, ImageBackground, StyleSheet, Dimensions, Platform } from 'react-native';
import { Theme } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Renders a lobby design based on a theme and its mapping configuration.
 * 
 * Config Structure Example:
 * {
 *   "styles": {
 *      "Default": [
 *         { "x": 250, "y": 600, "mapping": "team_1_name", "fontSize": 16, "color": "#000", ... }
 *      ]
 *   },
 *   "activeStyle": "Default" // or uses "Default" as fallback
 * }
 */
const DesignRenderer = ({ theme, data, lobby, width = SCREEN_WIDTH }) => {
    // Detailed logging for debugging
    console.log('DesignRenderer DEBUG:', {
        themeId: theme?.id,
        themeName: theme?.name,
        themeUrl: theme?.url,
        hasMappingConfig: !!theme?.mapping_config,
        dataCount: data?.length,
        lobbyName: lobby?.name
    });

    if (!theme) {
        return (
            <View style={[styles.container, { width, height: 200, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#fff' }}>No theme selected</Text>
            </View>
        );
    }

    const { mapping_config } = theme;

    const isRowBased = !!(mapping_config?.rows && Array.isArray(mapping_config.rows));
    // Admin designs (with rows) usually use a large width. Let's try 4800 as it's more standard for these templates.
    const BASE_WIDTH = isRowBased ? 4800 : (Number(theme.width) || 1080);
    const BASE_HEIGHT = isRowBased ? 6789 : (Number(theme.height) || 1920); 
    const scaleFactor = width / BASE_WIDTH;
    const initialHeight = (BASE_HEIGHT * scaleFactor);

    // Determine the active config list and transformed items
    const { items: configItems, overlays, rowItems } = useMemo(() => {
        let items = [];
        let textOverlays = mapping_config?.text_overlays || [];
        let rows = mapping_config?.rows || [];

        if (!mapping_config) {
            console.log('DesignRenderer: No mapping_config found');
            return { items: [], overlays: [], rowItems: [] };
        }

        // Handle the nested structure provided by user
        if (mapping_config.styles) {
            const styleName = mapping_config.activeStyle || 'Default';
            items = mapping_config.styles[styleName] || mapping_config.styles['Default'] || [];
        }
        // Fallback for "textBoxes" at root
        else if (mapping_config.textBoxes && Array.isArray(mapping_config.textBoxes)) {
            items = mapping_config.textBoxes;
        }
        // Fallback for flat array
        else if (Array.isArray(mapping_config)) {
            items = mapping_config;
        }

        return { items, overlays: textOverlays, rowItems: rows };
    }, [mapping_config]);

    // Find max Y to set container height
    const containerHeight = useMemo(() => {
        let maxY = BASE_HEIGHT;
        
        if (configItems.length > 0) {
            const itemMaxY = configItems.reduce((max, item) => Math.max(max, (item.y || 0) + (item.fontSize || 20)), 0);
            maxY = Math.max(maxY, itemMaxY);
        }
        
        if (rowItems.length > 0) {
            // Find max Y in any field of the last row
            const lastRow = rowItems[rowItems.length - 1];
            Object.values(lastRow).forEach(field => {
                if (field && typeof field.y === 'number') {
                    maxY = Math.max(maxY, field.y + 100);
                }
            });
        }

        if (overlays.length > 0) {
            const overlayMaxY = overlays.reduce((max, item) => Math.max(max, (item.y || 0) + (item.font_size || 50)), 0);
            maxY = Math.max(maxY, overlayMaxY);
        }

        return Math.max(initialHeight, maxY * scaleFactor);
    }, [configItems, rowItems, overlays, initialHeight, scaleFactor, BASE_HEIGHT]);


    /**
     * Resolves the value for a specific mapping key from the lobby data.
     * Supported formats:
     * - team_{n}_{field} (e.g. team_1_name, team_2_points)
     * - lobby_{field} (e.g. lobby_name)
     * - tournament_{field} (legacy support)
     */
    const getMappedValue = (mappingKey, fallbackValue) => {
        if (!mappingKey) return fallbackValue || '';

        const key = mappingKey.toLowerCase().trim();
        console.log(`Mapping key: ${key}`);

        // 1. Lobby Metadata
        if (key.includes('lobby') || key.includes('tournament')) {
            if (key.includes('name')) return lobby?.name || fallbackValue || '';
            if (key.includes('game')) return lobby?.game || fallbackValue || '';
            if (key.includes('date')) return lobby?.date || fallbackValue || '';
            if (key.includes('organizer')) return lobby?.organizer || fallbackValue || '';
        }

        // 2. Team Data
        // Flexible regex to match "team_1_name", "team1name", "team 1 name", etc.
        const teamMatch = key.match(/team[_\s-]*(\d+)[_\s-]*(.+)/);
        if (teamMatch) {
            const index = parseInt(teamMatch[1], 10) - 1;
            const field = teamMatch[2].replace(/[_\s-]/g, '');
            const team = data[index];

            if (!team) return '';

            if (field.includes('name')) return team.team_name || '';
            if (field.includes('points') || field === 'total') return (team.total || 0).toString();
            if (field.includes('kills')) return (team.kill_points || 0).toString();
            if (field.includes('wins')) return (team.wins || 0).toString();
            if (field.includes('placement')) return (team.placement_points || 0).toString();
            if (field.includes('rank')) return (index + 1).toString();
            if (field.includes('slot') || field.includes('position')) {
                return (team.respective_slotlist_postion || (index + 1)).toString();
            }
            
            return team[field] || team.team_name || '';
        }

        // 3. Direct field match in team if no prefix (for some configs)
        if (data && data[0]) {
            const field = key.replace(/[_\s-]/g, '');
            if (field === 'lobbyname' || field === 'tournamentname') return lobby?.name || '';
            // If it's just "name", "points", etc., it might be intended for the first team or a general label
            // but usually these are prefixed.
        }

        return fallbackValue || '';
    };

    const getImageUrl = (url, theme) => {
        if (!url) return null;
        
        // Handle potential stringified objects or weird formats
        let cleanUrl = String(url).replace(/`/g, '').trim();
        
        // If it's already a full URL (non-Supabase or already absolute), return it
        if (cleanUrl.startsWith('http') && !cleanUrl.includes('storage/v1/object/public/themes/')) {
            return cleanUrl;
        }
        
        // Check if it's already a Supabase storage path or relative path
        if (cleanUrl.includes('storage/v1/object/public/themes/')) {
            if (cleanUrl.startsWith('http')) return cleanUrl;
            return `https://4a1447cb531c.ngrok-free.app/storage/themes/${cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl}`;
        }

        // If it looks like a relative path or filename
        const cleanPath = cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl;
        
        // CRITICAL FIX: If path starts with 'optimized/', it's almost certainly a Supabase asset
        // even if theme.user_id is null (e.g. Admin/Community designs)
        if (cleanPath.startsWith('optimized/')) {
            return `https://4a1447cb531c.ngrok-free.app/storage/themes/${cleanPath}`;
        }

        // Determine if it's a Supabase theme or a community API theme
        // Supabase themes typically have a user_id
        if (theme.user_id || theme.is_user_theme) {
            return `https://4a1447cb531c.ngrok-free.app/storage/themes/${cleanPath}`;
        }
        
        // Fallback for community API (lazarflow.app)
        return `https://4a1447cb531c.ngrok-free.app/${cleanPath}`;
    };

    // Try multiple fields for the URL
    const themeUrl = theme.url || theme.image || theme.design_url || theme.path || theme.imageUrl || theme.thumbnail || theme.preview_url || theme.preview || theme.mapping_config?.optimized_base_url;
    const imageUrl = getImageUrl(themeUrl, theme);
    
    console.log('DesignRenderer DEBUG - URLs:', {
        providedUrl: theme.url,
        fallbackFields: { image: theme.image, design_url: theme.design_url, path: theme.path },
        resolvedImageUrl: imageUrl
    });

    const imageSource = useMemo(() => (imageUrl ? { uri: imageUrl } : null), [imageUrl]);

    if (!imageUrl) {
        console.log('DesignRenderer: Missing Image URL. Full theme object:', JSON.stringify(theme, null, 2));
        return (
            <View style={[styles.container, { width, height: 400, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }]}>
                <Text style={{ color: '#ff4444', fontWeight: 'bold', fontSize: 18 }}>Design Image URL Problem</Text>
                <Text style={{ color: '#fff', fontSize: 14, marginTop: 15 }}>The system couldn't find a valid image for this design.</Text>
                <Text style={{ color: '#aaa', fontSize: 12, marginTop: 10 }}>Theme: {theme.name || 'Unnamed'}</Text>
                <Text style={{ color: '#555', fontSize: 10 }}>ID: {theme.id}</Text>
                
                <View style={{ backgroundColor: '#000', padding: 10, borderRadius: 5, marginTop: 20, width: '90%' }}>
                    <Text style={{ color: '#0f0', fontSize: 10, fontFamily: Theme.fonts.monospace }}>
                        Available Keys: {Object.keys(theme).join(', ')}
                    </Text>
                    <Text style={{ color: '#0f0', fontSize: 10, fontFamily: Theme.fonts.monospace, marginTop: 5 }}>
                        Raw URL Value: {JSON.stringify(themeUrl)}
                    </Text>
                </View>

                {configItems.length > 0 && (
                    <View style={{ marginTop: 20, padding: 10, borderWidth: 1, borderColor: '#333' }}>
                        <Text style={{ color: '#666', fontSize: 10 }}>Data mapping is configured, but background is missing.</Text>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={[styles.container, { width, height: containerHeight }]}>
            <ImageBackground
                source={imageSource}
                style={{ width: width, height: containerHeight, backgroundColor: '#1a1a1a' }}
                resizeMode="contain"
                onLoad={() => console.log('Design image loaded successfully')}
                onError={(e) => {
                    console.error('Design image failed to load:', e.nativeEvent.error);
                    // If image fails, we still want to see the text mappings
                }}
            >
                {/* Add a semi-transparent overlay if image is missing/dark to ensure text is visible during debug */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.1)' }]} pointerEvents="none" />

                {/* Remove distracting error message in preview mode */}
                {configItems.length === 0 && rowItems.length === 0 && overlays.length === 0 && (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        {/* Empty view instead of error text */}
                    </View>
                )}

                {/* Render Overlays (Organiser, Event Name, etc.) */}
                {overlays.map((overlay, idx) => {
                    let displayText = overlay.text || '';
                    const name = (overlay.name || '').toLowerCase();
                    
                    // Map common overlay names to lobby data
                    if (name.includes('event') || name.includes('lobby')) displayText = lobby?.name || displayText;
                    else if (name.includes('organiser') || name.includes('organizer')) displayText = lobby?.organizer || displayText;
                    else if (name.includes('game')) displayText = lobby?.game || displayText;
                    else if (name.includes('date')) displayText = lobby?.date || displayText;

                    if (!displayText && !overlay.text) return null;

                    return (
                        <Text
                            key={`overlay-${idx}`}
                            style={{
                                position: 'absolute',
                                left: (overlay.x || 0) * scaleFactor,
                                top: (overlay.y || 0) * scaleFactor,
                                width: (overlay.width || 1000) * scaleFactor,
                                color: overlay.color_rgb ? `rgb(${overlay.color_rgb.join(',')})` : '#fff',
                                fontSize: (overlay.font_size || 80) * scaleFactor * 1.2, // Increase overlay font size
                                textAlign: overlay.alignment || 'center',
                                fontWeight: '900', // Super bold for overlays
                                textShadowColor: 'rgba(0,0,0,0.8)',
                                textShadowOffset: { width: 1, height: 1 },
                                textShadowRadius: 4,
                            }}
                        >
                            {displayText}
                        </Text>
                    );
                })}

                {/* Render Row Items (Teams) */}
                {rowItems.map((row, rowIndex) => {
                    let team = data && data[rowIndex];
                    
                    // If no data, show placeholders for the first few rows to "make it nice" for preview
                    if (!team && rowIndex < 5 && (!data || data.length === 0)) {
                        team = {
                            team_name: `Team ${rowIndex + 1}`,
                            wins: 0,
                            placement_points: 0,
                            kill_points: 0,
                            total: 0
                        };
                    }

                    if (!team) return null;

                    return Object.entries(row).map(([fieldKey, config], fieldIndex) => {
                        let value = '';
                        if (fieldKey === 'rank') value = (rowIndex + 1).toString();
                        else if (fieldKey === 'team') value = team.team_name || '';
                        else if (fieldKey === 'w') value = (team.wins || 0).toString();
                        else if (fieldKey === 'pp') value = (team.placement_points || 0).toString();
                        else if (fieldKey === 'kp') value = (team.kill_points || 0).toString();
                        else if (fieldKey === 'total') value = (team.total || 0).toString();

                        const alignment = config.alignment || 'center';
                        const fieldWidth = fieldKey === 'team' ? 1200 : 400; // Teams need more space
                        const scaledWidth = fieldWidth * scaleFactor;
                        
                        // If centered, offset left to make X the center point
                        const leftPos = alignment === 'center' 
                            ? (config.x * scaleFactor) - (scaledWidth / 2)
                            : config.x * scaleFactor;

                        return (
                            <Text
                                key={`row-${rowIndex}-field-${fieldKey}`}
                                style={{
                                    position: 'absolute',
                                    left: leftPos,
                                    top: (config.y || 0) * scaleFactor,
                                    width: scaledWidth,
                                    color: '#fff',
                                    fontSize: (mapping_config?.scoreboard?.font_size || 110) * scaleFactor * 0.9,
                                    textAlign: alignment,
                                    fontWeight: '700', // Bolder for better visibility
                                    textShadowColor: 'rgba(0,0,0,0.8)',
                                    textShadowOffset: { width: 1, height: 1 },
                                    textShadowRadius: 3,
                                }}
                            >
                                {value}
                            </Text>
                        );
                    });
                })}

                {/* Render Classic configItems */}
                {configItems.map((item, index) => {
                    // Try to get mapped value, enable fallback to item.value ("Select Data")
                    const value = getMappedValue(item.mapping, item.value);
                    
                    if (!value && !item.value) return null;

                    // Style Mapping
                    const elementStyle = {
                        left: (Number(item.x) || 0) * scaleFactor,
                        top: (Number(item.y) || 0) * scaleFactor,
                        width: item.width ? Number(item.width) * scaleFactor : undefined,
                        position: 'absolute',

                        // Text Styles
                        color: item.color || '#FFFFFF', // Default to white for visibility
                        fontSize: (Number(item.fontSize) || 14) * scaleFactor,
                        fontWeight: item.fontWeight === 'bold' ? 'bold' : 'normal',
                        textAlign: item.textAlign || 'left',
                        // Ensure text is visible even if background is same color
                        textShadowColor: 'rgba(0, 0, 0, 0.75)',
                        textShadowOffset: { width: 1, height: 1 },
                        textShadowRadius: 2,
                    };

                    return (
                        <Text 
                            key={`mapped-${index}`} 
                            style={elementStyle} 
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {value || item.value}
                        </Text>
                    );
                })}
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#000',
        overflow: 'hidden',
    },
});

export default DesignRenderer;
