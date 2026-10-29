import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking } from 'react-native';
import { X, Zap, Crown, Infinity as InfinityIcon, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../../styles/theme';

const WHATSAPP_NUMBER = '919121314837';
const WHATSAPP_MESSAGE = "Hi LazarFlow, I'd like to claim the Lifetime Unlimited AI offer!";
const SEEN_KEY = '@lifetime_offer_seen_v1';

const BENEFITS = [
    { icon: Zap, text: 'Unlimited AI Result Extractions' },
    { icon: Crown, text: 'Unlimited Lobbies & Tournaments' },
    { icon: InfinityIcon, text: 'Lifetime Access — No Monthly Fees' },
];

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

interface LifetimeOfferModalProps {
    visible: boolean;
    onClose: () => void;
}

export const LifetimeOfferModal: React.FC<LifetimeOfferModalProps> = ({ visible, onClose }) => {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

                <LinearGradient
                    colors={['#1a1a2e', '#16213e', '#0f3460']}
                    style={styles.sheet}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {/* Close button */}
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <X size={22} color="#94a3b8" />
                    </TouchableOpacity>

                    {/* Scarcity badge */}
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>🔥 Limited Founder Spots</Text>
                    </View>

                    {/* Headline */}
                    <Text style={styles.headline}>Free Lifetime</Text>
                    <Text style={styles.headlineAccent}>Unlimited AI Access</Text>

                    {/* Subtitle */}
                    <Text style={styles.subtitle}>
                        We're giving a limited number of organizers free lifetime access
                        to our AI extraction tools. No subscriptions, no expiry.
                    </Text>

                    {/* Benefits list */}
                    <View style={styles.benefitsList}>
                        {BENEFITS.map((benefit, index) => {
                            const Icon = benefit.icon;
                            return (
                                <View key={index} style={styles.benefitItem}>
                                    <View style={styles.benefitIconWrap}>
                                        <Icon size={18} color="#f59e0b" />
                                    </View>
                                    <Text style={styles.benefitText}>{benefit.text}</Text>
                                    <Check size={16} color="#22c55e" style={styles.checkIcon} />
                                </View>
                            );
                        })}
                    </View>

                    {/* WhatsApp CTA */}
                    <TouchableOpacity style={styles.ctaButton} onPress={openWhatsApp} activeOpacity={0.85}>
                        <Text style={styles.ctaText}>Claim Your Spot on WhatsApp</Text>
                    </TouchableOpacity>

                    {/* Dismiss */}
                    <TouchableOpacity style={styles.dismissBtn} onPress={onClose}>
                        <Text style={styles.dismissText}>Maybe later</Text>
                    </TouchableOpacity>
                </LinearGradient>
            </View>
        </Modal>
    );
};

/**
 * Hook that manages the one-time visibility of the lifetime offer modal.
 * Shows the modal on first app open, then never again (persisted via AsyncStorage).
 */
export const useLifetimeOfferModal = () => {
    const [offerVisible, setOfferVisible] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(SEEN_KEY).then(seen => {
            if (!seen) {
                // Small delay so the dashboard is fully rendered first
                const timer = setTimeout(() => {
                    setOfferVisible(true);
                    AsyncStorage.setItem(SEEN_KEY, 'true');
                }, 1200);
                return () => clearTimeout(timer);
            }
        });
    }, []);

    const closeOffer = () => setOfferVisible(false);

    return { offerVisible, closeOffer };
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    sheet: {
        paddingTop: 12,
        paddingHorizontal: 24,
        paddingBottom: 36,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '85%',
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    badge: {
        alignSelf: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginTop: 20,
        marginBottom: 16,
    },
    badgeText: {
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.semibold,
        color: '#f59e0b',
    },
    headline: {
        fontSize: 28,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#f1f5f9',
        textAlign: 'center',
    },
    headlineAccent: {
        fontSize: 28,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#f59e0b',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 12,
        marginBottom: 24,
    },
    benefitsList: {
        gap: 14,
        marginBottom: 28,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    benefitIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    benefitText: {
        flex: 1,
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#e2e8f0',
    },
    checkIcon: {
        marginRight: 4,
    },
    ctaButton: {
        backgroundColor: '#25D366',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    ctaText: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#0a3d1c',
    },
    dismissBtn: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    dismissText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#64748b',
    },
});
