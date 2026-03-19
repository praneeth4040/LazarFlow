import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Palette, User } from 'lucide-react-native';
import { Theme } from '../../../styles/theme';
import { getDesignImageSource } from '../../../lib/dataService';

export const CommunityDesignCard = React.memo(({ theme, index, isRightColumn = false, onPress }) => {
    const imageSource = getDesignImageSource(theme);
    const height = isRightColumn ? 180 + (index % 3) * 50 : 200 + (index % 3) * 40;
    
    return (
        <TouchableOpacity style={styles.pinCard} onPress={onPress} activeOpacity={0.9}>
            <View style={styles.pinImageContainer}>
                {imageSource ? (
                    <Image 
                        source={imageSource} 
                        style={[styles.pinImage, { height }]} 
                        resizeMode="cover" 
                        fadeDuration={300}
                    />
                ) : (
                    <View style={[styles.pinImage, { height, backgroundColor: Theme.colors.secondary, justifyContent: 'center', alignItems: 'center' }]}>
                        <Palette size={32} color={Theme.colors.textSecondary} />
                    </View>
                )}
            </View>
            <View style={styles.pinContent}>
                <Text style={styles.pinTitle} numberOfLines={2}>{theme.name || `Design #${index + 1}`}</Text>
                <View style={styles.pinMeta}>
                    <View style={styles.pinAuthor}>
                        <View style={styles.pinAvatar}>
                            <Text style={styles.pinAvatarText}>{(theme.author || 'C').charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.pinAuthorName} numberOfLines={1}>{theme.author || 'Community'}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
});

export const UserThemeCard = React.memo(({ theme, index, isRightColumn = false, onPress }) => {
    const imageSource = getDesignImageSource(theme);
    const height = isRightColumn ? 180 + (index % 3) * 50 : 200 + (index % 3) * 40;
    
    return (
        <TouchableOpacity style={styles.pinCard} onPress={onPress} activeOpacity={0.9}>
            <View style={styles.pinImageContainer}>
                {imageSource ? (
                    <Image 
                        source={imageSource} 
                        style={[styles.pinImage, { height }]} 
                        resizeMode="cover" 
                        fadeDuration={300}
                    />
                ) : (
                    <View style={[styles.pinImage, { height, backgroundColor: Theme.colors.secondary, justifyContent: 'center', alignItems: 'center' }]}>
                        <Palette size={32} color={Theme.colors.textSecondary} />
                    </View>
                )}
                
                {/* Status Overlay */}
                <View style={[
                    styles.previewOverlay, 
                    { 
                        top: 8, 
                        right: 8, 
                        backgroundColor: theme.status === 'pending' ? 'rgba(245, 158, 11, 0.8)' : 'rgba(16, 185, 129, 0.8)' 
                    }
                ]}>
                    <Text style={[styles.previewTag, { fontSize: 8 }]}>
                        {theme.status === 'pending' ? 'PENDING' : 'VERIFIED'}
                    </Text>
                </View>
            </View>
            <View style={styles.pinContent}>
                <Text style={styles.pinTitle} numberOfLines={2}>{theme.name || `Design #${index + 1}`}</Text>
                <View style={styles.pinMeta}>
                    <View style={styles.pinAuthor}>
                        <View style={[styles.pinAvatar, { backgroundColor: Theme.colors.accent }]}>
                            <User size={10} color="#fff" />
                        </View>
                        <Text style={styles.pinAuthorName} numberOfLines={1}>My Design</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    pinCard: {
        marginBottom: 16,
        backgroundColor: 'transparent',
    },
    pinImageContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: Theme.colors.card,
        marginBottom: 8,
    },
    pinImage: {
        width: '100%',
        backgroundColor: Theme.colors.secondary,
    },
    pinContent: {
        paddingHorizontal: 4,
    },
    pinTitle: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textPrimary,
        marginBottom: 6,
        lineHeight: 20,
    },
    pinMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pinAuthor: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    pinAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    pinAvatarText: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textSecondary,
    },
    pinAuthorName: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        flex: 1,
    },
    previewOverlay: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    previewTag: {
        color: '#fff',
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.bold,
        letterSpacing: 1,
    },
});
