import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar, Image } from 'react-native';
import { Trophy, Shield, Zap, Star, Sparkles, ArrowRight } from 'lucide-react-native';
import { Theme } from '../styles/theme';

const LandingScreen = ({ navigation }) => {
    return (
        <SafeAreaView style={styles.container}>
            <View style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }} />
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={{ width: 40, height: 40, marginRight: 10 }}
                            resizeMode="contain"
                        />
                        <Text style={styles.logoText}>LazarFlow</Text>
                    </View>
                    <View style={styles.navRow}>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.navLink}>Login</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.navButton}
                            onPress={() => navigation.navigate('SignUp')}
                        >
                            <Text style={styles.navButtonText}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Hero Section */}
                <View style={styles.hero}>
                    <View style={styles.heroBadge}>
                        <Sparkles size={14} color={Theme.colors.accent} />
                        <Text style={styles.heroBadgeText}>GAMING STANDINGS REIMAGINED</Text>
                    </View>
                    <Text style={styles.heroTitle}>Level Up Your{'\n'}<Text style={styles.gradientText}>Tournaments</Text></Text>
                    <Text style={styles.heroSubtitle}>Professional esports management and live standings for everyone.</Text>

                    <View style={styles.btnRow}>
                        <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('SignUp')}>
                            <Text style={styles.btnPrimaryText}>Start Building</Text>
                            <ArrowRight size={18} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.btnSecondaryText}>Log In</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.heroStats}>
                        <View style={styles.statItem}>
                            <Trophy size={20} color={Theme.colors.accent} />
                            <Text style={styles.statNumber}>10k+</Text>
                            <Text style={styles.statLabel}>Tournaments</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Shield size={20} color={Theme.colors.accent} />
                            <Text style={styles.statNumber}>99.9%</Text>
                            <Text style={styles.statLabel}>Reliability</Text>
                        </View>
                    </View>
                </View>

                {/* Feature Cards */}
                <View style={styles.features}>
                    <Text style={styles.sectionHeader}>Why LazarFlow?</Text>

                    <FeatureCard
                        icon={<Zap size={32} color={Theme.colors.accent} />}
                        title="LexiView OCR Engine"
                        desc="Extract scoreboard data from screenshots with 99.9% accuracy."
                    />
                    <FeatureCard
                        icon={<Star size={32} color={Theme.colors.accent} />}
                        title="Custom Points Tables"
                        desc="Design your own layouts. Customize colors, fonts, and styles."
                    />
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerLogo}>LazarFlow</Text>
                    <Text style={styles.footerTagline}>Professional Esports Tournament Management</Text>
                    <View style={styles.footerLinks}>
                        <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                            <Text style={styles.footerLink}>Privacy Policy</Text>
                        </TouchableOpacity>
                        <Text style={styles.footerDot}>•</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('TermsAndConditions')}>
                            <Text style={styles.footerLink}>Terms & Conditions</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.copyright}>© {new Date().getFullYear()} LazarFlow. All rights reserved.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const FeatureCard = ({ icon, title, desc }) => (
    <View style={styles.featureCard}>
        <View style={styles.featureIcon}>{icon}</View>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.primary,
    },
    scrollContent: {
        paddingBottom: 40,
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border
    },
    logoText: { fontSize: 24, fontWeight: 'bold', color: Theme.colors.textPrimary },
    navRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    navLink: { color: Theme.colors.textSecondary, fontSize: 16 },
    navButton: { backgroundColor: Theme.colors.accent, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
    navButtonText: { color: '#fff', fontWeight: 'bold' },

    hero: {
        paddingVertical: 80,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(26, 115, 232, 0.1)',
        borderRadius: 50,
        borderWidth: 1,
        borderColor: 'rgba(26, 115, 232, 0.2)',
        marginBottom: 20,
    },
    heroBadgeText: {
        color: Theme.colors.accent,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    heroTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        textAlign: 'center',
        lineHeight: 44,
        marginBottom: 15,
    },
    gradientText: {
        color: Theme.colors.accent,
    },
    heroSubtitle: {
        fontSize: 18,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 26,
    },
    btnRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 40,
        width: '100%',
        justifyContent: 'center',
    },
    btnPrimary: {
        backgroundColor: Theme.colors.accent,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: Theme.colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    btnPrimaryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    btnSecondary: {
        backgroundColor: '#fff',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    btnSecondaryText: {
        color: Theme.colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    heroStats: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.card,
        padding: 20,
        borderRadius: Theme.radius.lg,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        width: '100%',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        marginTop: 5,
    },
    statLabel: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: Theme.colors.border,
    },
    features: {
        paddingHorizontal: 20,
        gap: 20,
    },
    sectionHeader: { fontSize: 24, fontWeight: 'bold', color: Theme.colors.textPrimary, marginBottom: 20 },
    featureCard: {
        backgroundColor: Theme.colors.card,
        padding: 24,
        borderRadius: Theme.radius.lg,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    featureIcon: {
        marginBottom: 15,
    },
    featureTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        marginBottom: 8,
    },
    featureDesc: {
        color: Theme.colors.textSecondary,
        lineHeight: 22,
    },
    footer: {
        padding: 60,
        backgroundColor: Theme.colors.secondary,
        alignItems: 'center',
        marginTop: 60,
    },
    footerLogo: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        marginBottom: 8,
    },
    footerTagline: {
        color: Theme.colors.textSecondary,
        fontSize: 14,
        marginBottom: 30,
        textAlign: 'center',
    },
    footerLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 30,
    },
    footerLink: {
        color: Theme.colors.accent,
        fontSize: 14,
        fontWeight: '600',
    },
    footerDot: {
        color: Theme.colors.border,
    },
    copyright: {
        color: Theme.colors.textSecondary,
        fontSize: 12,
    },
});

export default LandingScreen;
