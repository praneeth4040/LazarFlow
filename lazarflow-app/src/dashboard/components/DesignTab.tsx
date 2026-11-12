import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { Palette, MessageCircle, Sparkles, FileUp } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { CommunityDesignCard, UserThemeCard } from './ThemeCards';
import { getDesignImageSource } from '../../lib/dataService';
import { Theme as ThemeType, getThemeType } from '../types';
import { RENDER_TYPES, RenderTypeId } from '../../shared/domain/renderTypes';

const WHATSAPP_NUMBER = '919121314837';
const WHATSAPP_MESSAGE = "Hello LazarFlow, I'd like to request a custom design theme!";

const openWhatsApp = () => {
    const deepLink = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    Linking.canOpenURL(deepLink).then(supported => {
        if (supported) {
            Linking.openURL(deepLink);
        } else {
            Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`);
        }
    });
};

interface DesignTabProps {
    designTab: string;
    setDesignTab: (tab: string) => void;
    userThemesList: ThemeType[];
    communityThemesList: ThemeType[];
    loadingCommunity: boolean;
    setPreviewImage: (source: any) => void;
    onRefresh?: () => void;
    refreshing?: boolean;
    onNavigateToDesign: (theme: ThemeType) => void;
    /** Opens the .des import sheet (handled by DashboardPage). */
    onOpenImport: () => void;
}

type TypeFilter = 'all' | RenderTypeId;

const DesignTab: React.FC<DesignTabProps> = ({
    designTab,
    setDesignTab,
    userThemesList,
    communityThemesList,
    loadingCommunity,
    setPreviewImage,
    onRefresh,
    refreshing = false,
    onNavigateToDesign,
    onOpenImport,
}) => {
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

    const matchesType = (t: ThemeType) => typeFilter === 'all' || getThemeType(t) === typeFilter;
    const visibleUserThemes = userThemesList.filter(matchesType);
    const visibleCommunityThemes = communityThemesList.filter(matchesType);

    return (
        <ScrollView
            style={styles.content}
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.accent} /> : undefined}
        >
            {/* Render-type filter chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typeChipRow}
            >
                <TouchableOpacity
                    style={[styles.typeChip, typeFilter === 'all' && styles.typeChipActive]}
                    onPress={() => setTypeFilter('all')}
                >
                    <Text style={[styles.typeChipLabel, typeFilter === 'all' && styles.typeChipLabelActive]}>All</Text>
                </TouchableOpacity>
                {RENDER_TYPES.map(rt => {
                    const Icon = rt.icon;
                    const active = typeFilter === rt.id;
                    return (
                        <TouchableOpacity
                            key={rt.id}
                            style={[styles.typeChip, active && styles.typeChipActive]}
                            onPress={() => setTypeFilter(rt.id)}
                        >
                            <Icon size={13} color={active ? '#fff' : Theme.colors.textSecondary} />
                            <Text style={[styles.typeChipLabel, active && styles.typeChipLabelActive]}>{rt.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

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
                    <TouchableOpacity style={styles.importCard} onPress={onOpenImport} activeOpacity={0.8}>
                        <View style={styles.importIconWrap}>
                            <FileUp size={24} color={Theme.colors.accent} />
                        </View>
                        <View style={styles.whatsappBody}>
                            <Text style={styles.whatsappTitle}>Import Design File</Text>
                            <Text style={styles.whatsappSubtitle}>Have a .des design? Add it to your account in seconds.</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.whatsappCard} onPress={openWhatsApp} activeOpacity={0.8}>
                        <View style={styles.whatsappIconWrap}>
                            <MessageCircle size={28} color="#25D366" />
                        </View>
                        <View style={styles.whatsappBody}>
                            <Text style={styles.whatsappTitle}>Want a Custom Design?</Text>
                            <Text style={styles.whatsappSubtitle}>Message us on WhatsApp and we'll create it for you!</Text>
                        </View>
                    </TouchableOpacity>

                    {visibleUserThemes.length === 0 ? (
                        <View style={[styles.emptyState, { marginTop: 40 }]}>
                            <Palette size={48} color={Theme.colors.border} />
                            <Text style={styles.emptyText}>
                                {typeFilter === 'all' ? 'No Custom Designs Yet' : `No ${RENDER_TYPES.find(rt => rt.id === typeFilter)?.label} Designs Yet`}
                            </Text>
                            <Text style={styles.emptySubText}>Import a .des design file or message us on WhatsApp to get one!</Text>
                            <TouchableOpacity style={styles.emptyImportBtn} onPress={onOpenImport}>
                                <FileUp size={15} color="#fff" />
                                <Text style={styles.emptyImportBtnText}>Import a Design File</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.pinterestGrid}>
                            <View style={styles.masonryColumn}>
                                {visibleUserThemes.filter((_, i) => i % 2 === 0).map((theme, index) => (
                                    <UserThemeCard
                                        key={theme.id || `own-left-${index}`}
                                        theme={theme}
                                        index={index}
                                        onPress={() => onNavigateToDesign(theme)}
                                    />
                                ))}
                            </View>
                            <View style={styles.masonryColumn}>
                                {visibleUserThemes.filter((_, i) => i % 2 !== 0).map((theme, index) => (
                                    <UserThemeCard
                                        key={theme.id || `own-right-${index}`}
                                        theme={theme}
                                        index={index}
                                        isRightColumn={true}
                                        onPress={() => onNavigateToDesign(theme)}
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
                    ) : visibleCommunityThemes.length === 0 ? (
                        <View style={[styles.emptyState, { marginTop: 40 }]}>
                            <Sparkles size={48} color={Theme.colors.border} />
                            <Text style={styles.emptyText}>
                                {typeFilter === 'all' ? 'No Community Designs Found' : `No Community ${RENDER_TYPES.find(rt => rt.id === typeFilter)?.label} Designs`}
                            </Text>
                            <Text style={styles.emptySubText}>Check back later for new designs!</Text>
                        </View>
                    ) : (
                        <View style={styles.pinterestGrid}>
                            <View style={styles.masonryColumn}>
                                {visibleCommunityThemes.filter((_, i) => i % 2 === 0).map((themes, index) => (
                                    <CommunityDesignCard
                                        key={themes.id || `left-${index}`}
                                        theme={themes}
                                        index={index}
                                        onPress={() => onNavigateToDesign(themes)}
                                    />
                                ))}
                            </View>
                            <View style={styles.masonryColumn}>
                                {visibleCommunityThemes.filter((_, i) => i % 2 !== 0).map((themes, index) => (
                                    <CommunityDesignCard
                                        key={themes.id || `right-${index}`}
                                        theme={themes}
                                        index={index}
                                        isRightColumn={true}
                                        onPress={() => onNavigateToDesign(themes)}
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
    typeChipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 14,
        paddingRight: 16,
    },
    typeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        backgroundColor: Theme.colors.primary,
    },
    typeChipActive: {
        backgroundColor: Theme.colors.accent,
        borderColor: Theme.colors.accent,
    },
    typeChipLabel: {
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textSecondary,
    },
    typeChipLabelActive: {
        color: '#fff',
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
    whatsappCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.primary,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#25D366',
        padding: 16,
        gap: 14,
        marginBottom: 8,
    },
    whatsappIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(37, 211, 102, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    whatsappBody: {
        flex: 1,
    },
    whatsappTitle: {
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textPrimary,
    },
    whatsappSubtitle: {
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        marginTop: 4,
    },
    importCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.primary,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Theme.colors.accent,
        padding: 16,
        gap: 14,
        marginBottom: 8,
    },
    importIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Theme.colors.accent + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyImportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Theme.colors.accent,
        paddingHorizontal: 18,
        paddingVertical: 11,
        borderRadius: 10,
        marginTop: 18,
    },
    emptyImportBtnText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.bold,
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
