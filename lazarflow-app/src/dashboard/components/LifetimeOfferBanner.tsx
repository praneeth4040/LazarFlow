import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { X, Crown } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../../styles/theme';

const WHATSAPP_NUMBER = '919121314837';
const WHATSAPP_MESSAGE = "Hi LazarFlow, I'd like to claim the Lifetime Unlimited AI offer!";
const DISMISSED_KEY = '@lifetime_offer_dismissed_v1';

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

/**
 * A dismissible banner card that appears on the Home tab.
 * Once dismissed, it never shows again (persisted via AsyncStorage).
 */
export const LifetimeOfferBanner: React.FC = () => {
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(DISMISSED_KEY).then(val => {
            if (val === 'true') setDismissed(true);
        });
    }, []);

    const handleDismiss = () => {
        setDismissed(true);
        AsyncStorage.setItem(DISMISSED_KEY, 'true');
    };

    if (dismissed) return null;

    return (
        <View style={styles.banner}>
            {/* Dismiss X */}
            <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color="#64748b" />
            </TouchableOpacity>

            {/* Left: icon */}
            <View style={styles.iconWrap}>
                <Crown size={20} color="#f59e0b" />
            </View>

            {/* Middle: text */}
            <View style={styles.body}>
                <Text style={styles.title}>Free Lifetime Unlimited AI</Text>
                <Text style={styles.subtitle}>Limited founder spots — claim yours!</Text>
            </View>

            {/* Right: CTA */}
            <TouchableOpacity style={styles.ctaBtn} onPress={openWhatsApp} activeOpacity={0.85}>
                <Text style={styles.ctaText}>Claim</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.35)',
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 12,
        marginBottom: 16,
    },
    closeBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#f1f5f9',
    },
    subtitle: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#94a3b8',
        marginTop: 2,
    },
    ctaBtn: {
        backgroundColor: '#25D366',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    ctaText: {
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#0a3d1c',
    },
});
