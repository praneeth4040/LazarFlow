import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { Trophy, CreditCard, BarChart2, Users, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { formatAlphanumericDate } from '../../lib/dateUtils';
import { getTierColors } from './HomeTab';

const getTierDisplayName = (tierName) => {
    const tierMap = {
        'free': 'Free Tier',
        'ranked': 'Ranked Tier',
        'competitive': 'Competitive Tier',
        'premier': 'Premier Tier',
        'developer': 'Developer Tier'
    };
    return tierMap[tierName?.toLowerCase()] || 'Free Tier';
};

const ProfileTab = ({
    user,
    tier,
    lobbiesCreated,
    maxAILobbies,
    maxLayouts,
    activeLayoutsCount,
    expandedSections,
    toggleSection,
    handleLogout,
    onNavigateToPlans,
    onNavigateToPrivacy
}) => {
    const subTier = user?.subscription_tier || tier;
    const colors = getTierColors(subTier);
    
    const email = user?.emails || user?.email || '—';
    const username = user?.username || '—';
    const displayName = user?.display_name || username || email.split('@')[0] || 'User';

    return (
        <ScrollView style={styles.profileContentWrapper} showsVerticalScrollIndicator={false}>
            <View style={{ height: 20 }} />

            <View style={styles.profileMainInfo}>
                <View style={styles.avatarWrapper}>
                    <View style={styles.avatarCircleCustom}>
                        <Text style={styles.avatarInitialCustom}>{displayName.charAt(0).toUpperCase()}</Text>
                    </View>
                </View>
                <Text style={styles.profileNameCustom}>{displayName}</Text>
                <View style={styles.masterTierBadge}>
                    <Trophy size={14} color={Theme.colors.accent} style={{ marginRight: 6 }} />
                    <Text style={styles.masterTierText}>{getTierDisplayName(subTier).toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.settingsSection}>
                <Text style={styles.sectionHeaderLabel}>ACCOUNT & SUBSCRIPTION</Text>
                
                <TouchableOpacity style={styles.settingCard} onPress={onNavigateToPlans}>
                    <View style={[styles.settingIconBg, { backgroundColor: '#eef2ff' }]}>
                        <CreditCard size={20} color="#4f46e5" />
                    </View>
                    <View style={styles.settingTextContent}>
                        <Text style={styles.settingTitle}>Manage Billing</Text>
                        <Text style={styles.settingSubtitle}>Plan details and invoices</Text>
                    </View>
                    <ChevronRight size={20} color={Theme.colors.border} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingCard} onPress={() => toggleSection('stats')}>
                    <View style={[styles.settingIconBg, { backgroundColor: '#f0fdf4' }]}>
                        <BarChart2 size={20} color="#16a34a" />
                    </View>
                    <View style={styles.settingTextContent}>
                        <Text style={styles.settingTitle}>Subscription Stats</Text>
                        <Text style={styles.settingSubtitle}>Engagement and reach metrics</Text>
                    </View>
                    <ChevronRight size={20} color={Theme.colors.border} style={{ transform: [{ rotate: expandedSections.stats ? '90deg' : '0deg' }] }} />
                </TouchableOpacity>
                {expandedSections.stats && (
                    <View style={styles.expandedContentCard}>
                        <View style={styles.statContainer}>
                            <View style={styles.statHeader}>
                                <View>
                                    <Text style={styles.profileStatLabel}>Active Tournaments</Text>
                                    <Text style={styles.statSubLabel}>
                                        {tier === 'developer' ? 'Unlimited available' : `${Math.max(0, (maxAILobbies || 0) - lobbiesCreated)} remaining`}
                                    </Text>
                                </View>
                                <Text style={[styles.statValue, { color: colors.color }]}>
                                    {lobbiesCreated} / {(maxAILobbies === Infinity || !maxAILobbies) ? '∞' : maxAILobbies}
                                </Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${(maxAILobbies === Infinity || !maxAILobbies) ? 100 : Math.min((lobbiesCreated / (maxAILobbies || 1)) * 100, 100)}%`,
                                        backgroundColor: colors.color
                                    }
                                ]} />
                            </View>
                        </View>

                        <View style={styles.statContainer}>
                            <View style={styles.statHeader}>
                                <View>
                                    <Text style={styles.profileStatLabel}>Active Layouts</Text>
                                    <Text style={styles.statSubLabel}>
                                        {tier === 'developer' ? 'Unlimited available' : `${Math.max(0, (maxLayouts || 0) - activeLayoutsCount)} slots remaining`}
                                    </Text>
                                </View>
                                <Text style={[styles.statValue, { color: colors.color }]}>
                                    {activeLayoutsCount} / {(maxLayouts === Infinity || !maxLayouts) ? '∞' : maxLayouts}
                                </Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${(maxLayouts === Infinity || !maxLayouts) ? 100 : Math.min((activeLayoutsCount / (maxLayouts || 1)) * 100, 100)}%`,
                                        backgroundColor: colors.color
                                    }
                                ]} />
                            </View>
                        </View>
                    </View>
                )}
            </View>

            <View style={styles.settingsSection}>
                <Text style={styles.sectionHeaderLabel}>COMMUNITY</Text>
                
                <TouchableOpacity 
                    style={[styles.settingCard, styles.communityCard]} 
                    onPress={() => {
                        const whatsappUrl = 'whatsapp://send?phone=919121314837&text=Hello LazarFlow, I am interested in a partnership!';
                        Linking.canOpenURL(whatsappUrl).then(supported => {
                            if (supported) {
                                Linking.openURL(whatsappUrl);
                            } else {
                                Linking.openURL('https://wa.me/919121314837');
                            }
                        });
                    }}
                >
                    <View style={[styles.settingIconBg, { backgroundColor: '#fff7ed' }]}>
                        <Users size={20} color="#ea580c" />
                    </View>
                    <View style={styles.settingTextContent}>
                        <Text style={styles.settingTitle}>Partnership</Text>
                        <Text style={styles.settingSubtitle}>Collaborations and rewards</Text>
                    </View>
                    <ChevronRight size={20} color={Theme.colors.border} />
                </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
                <Text style={styles.sectionHeaderLabel}>SUPPORT</Text>
                
                <TouchableOpacity style={styles.settingCard} onPress={onNavigateToPrivacy}>
                    <View style={[styles.settingIconBg, { backgroundColor: '#f1f5f9' }]}>
                        <HelpCircle size={20} color="#475569" />
                    </View>
                    <View style={styles.settingTextContent}>
                        <Text style={styles.settingTitle}>Legal & Support</Text>
                        <Text style={styles.settingSubtitle}>Terms of service and help center</Text>
                    </View>
                    <ChevronRight size={20} color={Theme.colors.border} />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.newLogoutBtn} onPress={handleLogout}>
                <LogOut size={20} color="#ef4444" style={{ marginRight: 10 }} />
                <Text style={styles.newLogoutText}>Log Out</Text>
            </TouchableOpacity>

            <Text style={styles.versionFooter}>LazarFlow v2.4.1 (Build 829)</Text>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    profileContentWrapper: {
        flex: 1,
        backgroundColor: Theme.colors.primary,
    },
    profileMainInfo: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 20,
    },
    avatarCircleCustom: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: '#334155',
        borderWidth: 4,
        borderColor: Theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitialCustom: {
        fontSize: 48,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#fff',
    },
    profileNameCustom: {
        fontSize: 26,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#0f172a',
        marginBottom: 12,
    },
    masterTierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    masterTierText: {
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
        letterSpacing: 1,
    },
    settingsSection: {
        marginTop: 30,
        paddingHorizontal: 24,
    },
    sectionHeaderLabel: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#94a3b8',
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    settingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 12,
        marginBottom: 12,
    },
    settingIconBg: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    settingTextContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#0f172a',
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#64748b',
    },
    communityCard: {
        backgroundColor: '#f8fafc',
        paddingHorizontal: 16,
        borderRadius: 24,
        paddingVertical: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    newLogoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff1f2',
        marginHorizontal: 24,
        marginTop: 40,
        paddingVertical: 18,
        borderRadius: 30,
    },
    newLogoutText: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#ef4444',
    },
    versionFooter: {
        textAlign: 'center',
        marginTop: 24,
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#94a3b8',
    },
    expandedContentCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginTop: -4,
    },
    statContainer: {
        marginBottom: 20,
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    profileStatLabel: {
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textPrimary,
        marginBottom: 2,
    },
    statSubLabel: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
    },
    statValue: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#f1f5f9',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
});

export default ProfileTab;
