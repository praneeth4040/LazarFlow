import React, { useMemo } from 'react';
import { View, Text, ImageBackground, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Renders a tournament design based on a theme and its mapping configuration.
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
const DesignRenderer = ({ theme, data, tournament, width = SCREEN_WIDTH }) => {
    if (!theme || !theme.url) return null;

    const { mapping_config } = theme;

    // Determine the active config list
    // Determine the active config list
    const configItems = useMemo(() => {
        if (!mapping_config) return [];

        // Handle the nested structure provided by user
        if (mapping_config.styles) {
            const styleName = mapping_config.activeStyle || 'Default';
            return mapping_config.styles[styleName] || mapping_config.styles['Default'] || [];
        }

        // Fallback for "textBoxes" at root (seen in some configs)
        if (mapping_config.textBoxes && Array.isArray(mapping_config.textBoxes)) {
            return mapping_config.textBoxes;
        }

        // Fallback for flat array (legacy/simple support)
        if (Array.isArray(mapping_config)) return mapping_config;

        return [];
    }, [mapping_config]);

    // Dimensions for scaling
    // Assuming the design canvas was 1920px wide based on the large X coordinates (e.g. 1473)
    // If we had canvasWidth in config it would be better, but 1920 is standard for this type of tool.
    const BASE_WIDTH = 1920;
    const scaleFactor = width / BASE_WIDTH;
    const height = (1080 * scaleFactor); // Initial aspect ratio guess, will expand if content is taller

    // Find max Y to set container height if needed (for scrolling or long designs)
    const containerHeight = useMemo(() => {
        const maxY = configItems.reduce((max, item) => Math.max(max, item.y || 0), 0);
        // Add padding/margin at bottom (e.g. 200px scaled)
        return Math.max(height, (maxY + 200) * scaleFactor);
    }, [configItems, height, scaleFactor]);


    /**
     * Resolves the value for a specific mapping key from the tournament data.
     * Supported formats:
     * - team_{n}_{field} (e.g. team_1_name, team_2_points)
     * - tournament_{field} (e.g. tournament_name)
     */
    const getMappedValue = (mappingKey, fallbackValue) => {
        if (!mappingKey) return fallbackValue || '';

        const key = mappingKey.toLowerCase();

        // 1. Tournament Metadata
        if (key.startsWith('tournament_')) {
            const field = key.replace('tournament_', '');
            return tournament?.[field] || fallbackValue || '';
        }

        // 2. Team Data
        // Regex to parse "team_1_name" -> index: 1, field: "name"
        const teamMatch = key.match(/^team_(\d+)_(.+)$/);
        if (teamMatch) {
            const index = parseInt(teamMatch[1], 10) - 1; // 1-based to 0-based
            const field = teamMatch[2];
            const team = data[index];

            if (!team) return ''; // No team at this rank

            switch (field) {
                case 'name': return team.team_name || '';
                case 'points': return (team.total || 0).toString();
                case 'total': return (team.total || 0).toString();
                case 'kills': return (team.kill_points || 0).toString(); // Assuming kill points = kills for now, or check structure
                case 'wins': return (team.wins || 0).toString();
                case 'placement': return (team.placement_points || 0).toString();
                case 'rank': return (index + 1).toString();
                default:
                    // Fallback to direct property access
                    return team[field] || '';
            }
        }

        // 3. Fallback/Direct
        return fallbackValue || mappingKey;
    };

    return (
        <View style={[styles.container, { width, height: containerHeight }]}>
            <ImageBackground
                source={{ uri: theme.url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
            >
                {configItems.map((item, index) => {
                    // Try to get mapped value, enable fallback to item.value ("Select Data")
                    const value = getMappedValue(item.mapping, item.value);

                    // Style Mapping
                    const elementStyle = {
                        left: item.x * scaleFactor,
                        top: item.y * scaleFactor,
                        width: item.width * scaleFactor, // Optional constrain
                        position: 'absolute',

                        // Text Styles
                        color: item.color || '#000',
                        fontSize: (item.fontSize || 14) * scaleFactor,
                        fontWeight: item.fontWeight === 'bold' ? 'bold' : 'normal',
                        textAlign: item.textAlign || 'left',
                        // Add more style props as needed (fontFamily, etc.)
                    };

                    return (
                        <Text key={`mapped-${index}`} style={elementStyle} numberOfLines={1}>
                            {value}
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
