import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Palette, User, Check, Layout, Trash2, Share2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../../styles/theme';
import { getDesignImageSource } from '../../lib/dataService';
import { Theme as ThemeType } from '../types';

interface DesignThemeCardProps {
    theme: ThemeType;
    index: number;
    onPress: () => void;
    variant?: 'standard' | 'grid';
    isSelected?: boolean;
    isRightColumn?: boolean;
    showStatus?: boolean;
}

export const DesignThemeCard: React.FC<DesignThemeCardProps> = React.memo(({ 
    theme, 
    index, 
    onPress,
    variant = 'standard',
    isSelected = false,
    isRightColumn = false,
    showStatus = false,
}) => {
    const imageSource = getDesignImageSource(theme);
    
    // Calculate heights/aspect ratios based on variant
    const height = variant === 'standard' 
        ? (isRightColumn ? 180 + (index % 3) * 50 : 200 + (index % 3) * 40)
        : undefined;
    
    const aspectRatio = variant === 'grid' ? 0.8 : undefined;

    // Badges/Status
    const isUserTheme = !!theme.user_id;

    return (
        <TouchableOpacity 
            style={[
                styles.card, 
                variant === 'grid' && styles.gridCard,
                isSelected && styles.selectedCard
            ]} 
            onPress={onPress} 
            activeOpacity={0.9}
        >
            <View style={[
                styles.imageContainer, 
                { height, aspectRatio },
                isSelected && styles.selectedImageContainer,
                variant === 'grid' && { borderRadius: 20 }
            ]}>
                {imageSource ? (
                    <Image 
                        source={imageSource as any} 
                        style={styles.image} 
                        resizeMode="cover" 
                        fadeDuration={300}
                    />
                ) : (
                    <View style={styles.placeholder}>
                        <Palette size={32} color={Theme.colors.textSecondary} />
                    </View>
                )}

                {/* Glassmorphism Overlays */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.1)', 'transparent', 'rgba(15, 23, 42, 0.85)']}
                    style={StyleSheet.absoluteFill as any}
                />

                {/* Badges */}
                <View style={styles.badgeContainer}>
                    {isUserTheme && showStatus && (
                        <View style={[
                            styles.statusBadge, 
                            { backgroundColor: theme.status === 'pending' ? '#f59e0b' : '#10b981' }
                        ]}>
                            <Text style={styles.badgeText}>
                                {theme.status?.toUpperCase() || 'VERIFIED'}
                            </Text>
                        </View>
                    )}
                </View>

            </View>

            {/* Selection Indicator */}
                {isSelected && (
                    <View style={styles.selectionCheck}>
                        <Check size={14} color="#fff" strokeWidth={3 as any} />
                    </View>
                )}

                {/* Card Info Content */}
                <View style={styles.infoOverlay}>
                    <Text style={styles.title} numberOfLines={1}>
                        {theme.name || (isUserTheme ? 'Custom Design' : 'Standings Template')}
                    </Text>
                    
                    <View style={styles.metaRow}>
                        {variant === 'grid' ? (
                            <View style={styles.typeTag}>
                                <Layout size={10} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.metaText}>1080 x 1920</Text>
                            </View>
                        ) : (
                            <View style={styles.authorTag}>
                                <View style={[styles.avatar, isUserTheme && { backgroundColor: Theme.colors.accent }]}>
                                    {isUserTheme ? (
                                        <User size={10} color="#fff" />
                                    ) : (
                                        <Text style={styles.avatarText}>{(theme.author || 'C').charAt(0).toUpperCase()}</Text>
                                    )}
                                </View>
                                <Text style={styles.metaText} numberOfLines={1}>
                                    {isUserTheme ? 'My Design' : (theme.author || 'Community')}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
        </TouchableOpacity>
    );
});

export const CommunityDesignCard: React.FC<DesignThemeCardProps> = (props) => <DesignThemeCard {...props} />;
export const UserThemeCard: React.FC<DesignThemeCardProps> = (props) => <DesignThemeCard {...props} showStatus={true} />;

const styles = StyleSheet.create({
    card: {
        marginBottom: 16,
        backgroundColor: 'transparent',
    },
    gridCard: {
        marginBottom: 0,
    },
    selectedCard: {
        transform: [{ scale: 1.02 }],
    },
    imageContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: Theme.colors.card,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedImageContainer: {
        borderColor: Theme.colors.accent,
        shadowColor: Theme.colors.accent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: Theme.colors.secondary,
    },
    placeholder: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeContainer: {
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 10,
        flexDirection: 'row',
        gap: 6,
    },
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f59e0b',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 9,
        fontFamily: Theme.fonts.outfit.bold,
        letterSpacing: 0.5,
    },
    selectionCheck: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        zIndex: 10,
    },
    infoOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 12,
        paddingBottom: 15,
    },
    title: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    authorTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    typeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    avatar: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 9,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#fff',
    },
    metaText: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.medium,
        color: 'rgba(255,255,255,0.8)',
    },
});
