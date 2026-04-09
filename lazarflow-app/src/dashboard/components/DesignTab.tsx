import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Palette, Upload, Sparkles } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { CommunityDesignCard, UserThemeCard } from './ThemeCards';
import { getDesignImageSource } from '../../lib/dataService';
import { Theme as ThemeType } from '../types';

interface DesignTabProps {
    designTab: string;
    setDesignTab: (tab: string) => void;
    handleDesignUpload: () => void;
    uploading: boolean;
    userThemesList: ThemeType[];
    communityThemesList: ThemeType[];
    loadingCommunity: boolean;
    setPreviewImage: (source: any) => void;
}

const DesignTab: React.FC<DesignTabProps> = ({
    designTab,
    setDesignTab,
    handleDesignUpload,
    uploading,
    userThemesList,
    communityThemesList,
    loadingCommunity,
    setPreviewImage
}) => {
    return (
        <ScrollView style={styles.content}>
            <View style={styles.designTabNav}>
                <TouchableOpacity
                    style={[styles.designTabBtn, designTab === 'own' && styles.designTabBtnActive]}
                    onPress={() => setDesignTab('own')}
                >
                    <Text style={[styles.designTabLabel, designTab === 'own' && styles.designTabLabelActive]}>Own</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.designTabBtn, designTab === 'community' && styles.designTabBtnActive]}
                    onPress={() => setDesignTab('community')}
                >
                    <Text style={[styles.designTabLabel, designTab === 'community' && styles.designTabLabelActive]}>Community</Text>
                </TouchableOpacity>
            </View>

            {designTab === 'own' && (
                <View style={styles.designSection}>
                    <TouchableOpacity style={styles.uploadAreaSmall} onPress={handleDesignUpload} disabled={uploading}>
                        {uploading ? (
                            <ActivityIndicator color={Theme.colors.accent} />
                        ) : (
                            <>
                                <Upload size={24} color={Theme.colors.accent} />
                                <Text style={styles.uploadTitleSmall}>Upload New Design</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {userThemesList.length === 0 ? (
                        <View style={[styles.emptyState, { marginTop: 40 }]}>
                            <Palette size={48} color={Theme.colors.border} />
                            <Text style={styles.emptyText}>No Custom Designs Yet</Text>
                            <Text style={styles.emptySubText}>Upload your first design to see it here!</Text>
                        </View>
                    ) : (
                        <View style={styles.pinterestGrid}>
                            <View style={styles.masonryColumn}>
                                {userThemesList.filter((_, i) => i % 2 === 0).map((theme, index) => (
                                    <UserThemeCard 
                                        key={theme.id || `own-left-${index}`} 
                                        theme={theme} 
                                        index={index} 
                                        onPress={() => setPreviewImage(getDesignImageSource(theme))}
                                    />
                                ))}
                            </View>
                            <View style={styles.masonryColumn}>
                                {userThemesList.filter((_, i) => i % 2 !== 0).map((theme, index) => (
                                    <UserThemeCard 
                                        key={theme.id || `own-right-${index}`} 
                                        theme={theme} 
                                        index={index} 
                                        isRightColumn={true}
                                        onPress={() => setPreviewImage(getDesignImageSource(theme))}
                                    />
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            )}

            {designTab === 'community' && (
                <View style={styles.designSection}>
                    {loadingCommunity ? (
                        <ActivityIndicator size="large" color={Theme.colors.accent} style={{ marginTop: 40 }} />
                    ) : communityThemesList.length === 0 ? (
                        <View style={[styles.emptyState, { marginTop: 40 }]}>
                            <Sparkles size={48} color={Theme.colors.border} />
                            <Text style={styles.emptyText}>No Community Designs Found</Text>
                            <Text style={styles.emptySubText}>Check back later for new designs!</Text>
                        </View>
                    ) : (
                        <View style={styles.pinterestGrid}>
                            <View style={styles.masonryColumn}>
                                {communityThemesList.filter((_, i) => i % 2 === 0).map((themes, index) => (
                                    <CommunityDesignCard 
                                        key={themes.id || `left-${index}`} 
                                        theme={themes} 
                                        index={index} 
                                        onPress={() => setPreviewImage(getDesignImageSource(themes))}
                                    />
                                ))}
                            </View>
                            <View style={styles.masonryColumn}>
                                {communityThemesList.filter((_, i) => i % 2 !== 0).map((themes, index) => (
                                    <CommunityDesignCard 
                                        key={themes.id || `right-${index}`} 
                                        theme={themes} 
                                        index={index} 
                                        isRightColumn={true}
                                        onPress={() => setPreviewImage(getDesignImageSource(themes))}
                                    />
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            )}
            <View style={{ height: 80 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
        padding: 16,
        backgroundColor: Theme.colors.secondary,
    },
    designTabNav: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    designTabBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    designTabBtnActive: {
        backgroundColor: Theme.colors.accent,
    },
    designTabLabel: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textSecondary,
    },
    designTabLabelActive: {
        color: '#fff',
    },
    designSection: {
        gap: 16,
    },
    uploadAreaSmall: {
        height: 100,
        backgroundColor: Theme.colors.primary,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderStyle: 'dashed',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 8,
    },
    uploadTitleSmall: {
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textPrimary,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: Theme.colors.textSecondary,
        fontSize: 16,
        marginTop: 10,
    },
    emptySubText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
    },
    pinterestGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 20,
    },
    masonryColumn: {
        width: '48%',
    },
});

export default DesignTab;
