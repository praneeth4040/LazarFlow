import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { CreditCard, Users, HelpCircle, LogOut, ChevronRight, Zap, Languages, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../styles/theme';
import { getTierColors } from './HomeTab';
import { User } from '../types';

interface ProfileTabProps {
    user: User | null;
    tier: string;
    lobbiesCreated?: number;
    maxAILobbies?: number;
    maxLayouts?: number;
    activeLayoutsCount?: number;
    expandedSections: Record<string, boolean>;
    toggleSection: (section: string) => void;
    handleLogout: () => void;
    onNavigateToPlans: () => void;
    onNavigateToPrivacy: () => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({
    user,
    tier,
    maxLayouts,
    activeLayoutsCount,
    expandedSections,
    toggleSection,
    handleLogout,
    onNavigateToPlans,
    onNavigateToPrivacy
}) => {
    const { t, i18n } = useTranslation();
    const email = user?.emails || user?.email || '—';
    const username = user?.username || '—';
    const displayName = user?.display_name || username || email.split('@')[0] || 'User';

    const currentLanguage = i18n.language;

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

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
                <View style={styles.balanceBadgeProfile}>
                    <Zap size={14} color="#f59e0b" fill="#f59e0b" style={{ marginRight: 6 }} />
                    <Text style={styles.balanceTextProfile}>{user?.flux_balance || 0} {t('profile.credits')}</Text>
                </View>
            </View>

            <View style={styles.settingsSection}>
                <Text style={styles.sectionHeaderLabel}>{t('profile.accountSubscription')}</Text>
                
                <TouchableOpacity style={styles.settingCard} onPress={onNavigateToPlans}>
                    <View style={[styles.settingIconBg, { backgroundColor: '#eef2ff' }]}>
                        <CreditCard size={20} color="#4f46e5" />
                    </View>
                    <View style={styles.settingTextContent}>
                        <Text style={styles.settingTitle}>{t('profile.manageBilling')}</Text>
                        <Text style={styles.settingSubtitle}>{t('profile.planDetails')}</Text>
                    </View>
                    <ChevronRight size={20} color={Theme.colors.border} />
                </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
                <Text style={styles.sectionHeaderLabel}>{t('profile.language')}</Text>
                
                <View style={styles.languageGrid}>
                    {[
                        { id: 'en', label: t('profile.english'), flag: '🇺🇸' },
                        { id: 'hi', label: t('profile.hindi'), flag: '🇮🇳' },
                        { id: 'th', label: t('profile.thai'), flag: '🇹🇭' },
                        { id: 'pt-BR', label: t('profile.brazilian'), flag: '🇧🇷' },
                        { id: 'pt', label: t('profile.portuguese'), flag: '🇵🇹' }
                    ].map((lang) => (
                        <TouchableOpacity 
                            key={lang.id}
                            style={[
                                styles.languageChip, 
                                currentLanguage === lang.id && styles.languageChipActive
                            ]} 
                            onPress={() => changeLanguage(lang.id)}
                        >
                            <Text style={styles.languageFlag}>{lang.flag}</Text>
                            <Text style={[
                                styles.languageChipText, 
                                currentLanguage === lang.id && styles.languageChipTextActive
                            ]}>
                                {lang.label}
                            </Text>
                            {currentLanguage === lang.id && (
                                <View style={styles.activeDot} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.settingsSection}>
                <Text style={styles.sectionHeaderLabel}>{t('profile.community')}</Text>
                
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
                        <Text style={styles.settingTitle}>{t('profile.partnership')}</Text>
                        <Text style={styles.settingSubtitle}>{t('profile.collabRewards')}</Text>
                    </View>
                    <ChevronRight size={20} color={Theme.colors.border} />
                </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
                <Text style={styles.sectionHeaderLabel}>{t('profile.support')}</Text>
                
                <TouchableOpacity style={styles.settingCard} onPress={onNavigateToPrivacy}>
                    <View style={[styles.settingIconBg, { backgroundColor: '#f1f5f9' }]}>
                        <HelpCircle size={20} color="#475569" />
                    </View>
                    <View style={styles.settingTextContent}>
                        <Text style={styles.settingTitle}>{t('profile.legalSupport')}</Text>
                        <Text style={styles.settingSubtitle}>{t('profile.termsHelp')}</Text>
                    </View>
                    <ChevronRight size={20} color={Theme.colors.border} />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.newLogoutBtn} onPress={handleLogout}>
                <LogOut size={20} color="#ef4444" style={{ marginRight: 10 }} />
                <Text style={styles.newLogoutText}>{t('profile.logout')}</Text>
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
    balanceBadgeProfile: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff7ed',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ffedd5',
    },
    balanceTextProfile: {
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#c2410c',
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
    languageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 4,
    },
    languageChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        minWidth: '47%',
    },
    languageChipActive: {
        backgroundColor: Theme.colors.accent + '08',
        borderColor: Theme.colors.accent + '40',
    },
    languageFlag: {
        fontSize: 18,
        marginRight: 10,
    },
    languageChipText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#475569',
        flex: 1,
    },
    languageChipTextActive: {
        color: Theme.colors.accent,
        fontFamily: Theme.fonts.outfit.bold,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Theme.colors.accent,
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
