import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { Shield, Mail, ArrowLeft } from 'lucide-react-native';
import { Theme } from '../styles/theme';

const PrivacyPolicyScreen = ({ navigation }) => {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: Theme.colors.primary }}>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <Shield size={40} color={Theme.colors.accent} />
                    </View>
                    <Text style={styles.title}>Privacy Policy</Text>
                    <Text style={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</Text>
                </View>

                <Section title="1. Introduction">
                    <Text style={styles.sectionContent}>At LazarFlow, we value your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our esports tournament management services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.</Text>
                </Section>

                <Section title="2. Information We Collect">
                    <Text style={styles.sectionContent}>We collect information that you voluntarily provide to us when you register on the website, express an interest in obtaining information about us or our products and services, when you participate in activities on the website, or otherwise when you contact us.</Text>
                    <BulletPoint label="Personal Data" content="Personally identifiable information, such as your name, shipping address, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us." />
                    <BulletPoint label="Derivative Data" content="Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Site." />
                </Section>

                <Section title="3. Use of Your Information">
                    <Text style={styles.sectionContent}>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. We may use information collected about you via the Site to:</Text>
                    <BulletPoint content="Create and manage your account." />
                    <BulletPoint content="Process your transactions and send you related information, including transaction confirmations and invoices." />
                    <BulletPoint content="Email you regarding your account or order." />
                    <BulletPoint content="Fulfill and manage purchases, orders, payments, and other transactions related to the Site." />
                    <BulletPoint content="Generate a personal profile about you to make future visits to the Site more personalized." />
                    <BulletPoint content="Increase the efficiency and operation of the Site." />
                    <BulletPoint content="Monitor and analyze usage and trends to improve your experience with the Site." />
                    <BulletPoint content="Internal research and development purposes, including but not limited to the training, tuning, and improvement of our machine learning models and algorithms to enhance the accuracy and performance of our services." />
                </Section>

                <Section title="4. Disclosure of Your Information">
                    <Text style={styles.sectionContent}>We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</Text>
                    <BulletPoint label="By Law or to Protect Rights" content="If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation." />
                </Section>

                <Section title="5. Security of Your Information">
                    <Text style={styles.sectionContent}>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</Text>
                </Section>

                <Section title="6. Contact Us">
                    <Text style={styles.sectionContent}>If you have questions or comments about this Privacy Policy, please contact us at support@lazarflow.app.</Text>
                    <View style={styles.contactCard}>
                        <Mail size={24} color={Theme.colors.accent} />
                        <Text style={styles.contactText}>support@lazarflow.app</Text>
                    </View>
                </Section>

                <View style={styles.footerContent}>
                    <Text style={styles.footerText}>© {new Date().getFullYear()} LazarFlow. All rights reserved.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const Section = ({ title, children }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
    </View>
);

const BulletPoint = ({ label, content }) => (
    <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>{'\u2022'}</Text>
        <Text style={styles.bulletText}>
            {label ? <Text style={styles.bold}>{label}: </Text> : null}
            {content}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.primary,
    },
    scrollContent: {
        padding: 24,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 24,
    },
    header: {
        marginBottom: 30,
        alignItems: 'center',
    },
    headerIcon: {
        marginBottom: 15,
        backgroundColor: 'rgba(26, 115, 232, 0.1)',
        padding: 16,
        borderRadius: 50,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        marginBottom: 8,
    },
    lastUpdated: {
        fontSize: 14,
        color: Theme.colors.textSecondary,
    },
    intro: {
        fontSize: 15,
        color: Theme.colors.textSecondary,
        lineHeight: 22,
        marginBottom: 30,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Theme.colors.accent,
        marginBottom: 12,
    },
    sectionContent: {
        fontSize: 15,
        color: Theme.colors.textPrimary,
        lineHeight: 24,
    },
    bulletPoint: {
        flexDirection: 'row',
        paddingLeft: 4,
        marginTop: 8,
    },
    bullet: {
        fontSize: 18,
        color: Theme.colors.accent,
        marginRight: 10,
        lineHeight: 22,
    },
    bulletText: {
        flex: 1,
        fontSize: 15,
        color: Theme.colors.textPrimary,
        lineHeight: 24,
    },
    bold: {
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.secondary,
        padding: 20,
        borderRadius: 16,
        marginTop: 10,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    contactText: {
        marginLeft: 15,
        fontSize: 16,
        color: Theme.colors.accent,
        fontWeight: 'bold',
    },
    footerContent: {
        marginTop: 20,
        paddingBottom: 40,
        alignItems: 'center',
    },
    footerText: {
        color: Theme.colors.textSecondary,
        fontSize: 14,
    },
});

export default PrivacyPolicyScreen;
