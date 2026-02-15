import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { Check, Sparkles, ArrowLeft, Award, Crown, Zap, ShieldCheck, Star } from 'lucide-react-native';
import { Theme } from '../styles/theme';
import { useSubscription } from '../hooks/useSubscription';
import { UserContext } from '../context/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RazorpayCheckout from 'react-native-razorpay';
import apiClient from '../lib/apiClient';
import {
    CFPaymentGatewayService,
} from 'react-native-cashfree-pg-sdk';

const SubscriptionPlansScreen = ({ navigation, isTab = false }) => {
    const { tier, lobbiesCreated, maxAILobbies, maxLayouts } = useSubscription();
    const { user } = useContext(UserContext);
    const insets = useSafeAreaInsets();

    // Check if Razorpay is linked/available
    const isRazorpayAvailable = React.useMemo(() => {
        try {
            return !!RazorpayCheckout && typeof RazorpayCheckout.open === 'function';
        } catch (e) {
            console.log('Error checking Razorpay availability:', e);
            return false;
        }
    }, [RazorpayCheckout]);

    // Check if Cashfree is linked/available
    const isCashfreeAvailable = React.useMemo(() => {
        try {
            return !!CFPaymentGatewayService && typeof CFPaymentGatewayService.setCallback === 'function';
        } catch (e) {
            console.log('Error checking Cashfree availability:', e);
            return false;
        }
    }, [CFPaymentGatewayService]);

    React.useEffect(() => {
        if (!isCashfreeAvailable) {
            console.warn('⚠️ Cashfree SDK not linked or available');
            return;
        }

        const onVerify = async (orderID) => {
            console.log('Order verified:', orderID);
            navigation.navigate('PaymentStatus', {
                status: 'success',
                orderId: orderID,
                message: 'Payment verified! Your plan has been updated.'
            });
        };

        const onError = (error, orderID) => {
            console.error('Payment failed:', error, orderID);
            navigation.navigate('PaymentStatus', {
                status: 'failure',
                orderId: orderID,
                message: error.message || 'Something went wrong with the payment.'
            });
        };

        try {
            CFPaymentGatewayService.setCallback({
                onVerify,
                onError,
            });
        } catch (err) {
            console.error('Error setting Cashfree callback:', err);
        }

        return () => {
            try {
                CFPaymentGatewayService.removeCallback();
            } catch (err) {
                // Ignore cleanup errors
            }
        };
    }, [isCashfreeAvailable]);

    const plans = [
        {
            id: 'free',
            name: 'Casual',
            price: '₹0',
            period: 'Forever',
            icon: <Zap size={24} color={Theme.colors.textSecondary} />,
            features: [
                '2 AI Lobbies per month',
                '1 Active Layout slot',
                'AI Extraction (Trial)',
                'Manual Points Table',
                'Standard support'
            ],
            color: '#64748b',
            isCurrent: tier === 'free'
        },
        {
            id: 'ranked',
            name: 'Ranked',
            price: '₹129',
            period: 'Monthly',
            icon: <ShieldCheck size={24} color="#3b82f6" />,
            features: [
                '60 AI Lobbies per month',
                '3 Active Layout slots',
                'AI Extraction',
                'Manual Points Table',
                'Support'
            ],
            color: '#3b82f6',
            isCurrent: tier === 'ranked'
        },
        {
            id: 'competitive',
            name: 'Competitive',
            price: '₹229',
            period: 'Monthly',
            icon: <Award size={24} color="#f59e0b" />,
            features: [
                '100 AI Lobbies per month',
                '5 Active Layout slots',
                'AI Extraction',
                'Manual Points Table',
                'Support'
            ],
            color: '#f59e0b',
            isCurrent: tier === 'competitive',
            isPopular: true
        },
        {
            id: 'premier',
            name: 'Premier',
            price: '₹329',
            period: 'Monthly',
            icon: <Crown size={24} color="#8b5cf6" />,
            features: [
                '150 AI Lobbies per month',
                '5 Active Layout slots',
                'AI Extraction',
                'Manual Points Table',
                'Support'
            ],
            color: '#8b5cf6',
            isCurrent: tier === 'premier'
        },
        {
            id: 'masters',
            name: 'Masters Circuit',
            price: 'Custom',
            period: 'Yearly',
            icon: <Sparkles size={24} color="#06b6d4" />,
            features: [
                'Unlimited AI Lobbies',
                'Unlimited Layout slots',
                'AI Extraction',
                'Manual Points Table',
                'White-glove Support'
            ],
            color: '#06b6d4',
            isCurrent: tier === 'masters' || tier === 'developer'
        }
    ];

    const handleClaim = async (plan) => {
        if (plan.isCurrent) {
            Alert.alert('Current Plan', `You are already subscribed to the ${plan.name} plan.`);
            return;
        }

        Alert.alert(
            'Upgrade Plan',
            `Would you like to upgrade to the ${plan.name} plan for ${plan.price}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Pay Now',
                    onPress: async () => {
                        try {
                            if (!user) throw new Error('User not found');

                            // --- RAZORPAY FLOW (PRIMARY) ---
                            try {
                                if (!isRazorpayAvailable) {
                                    console.warn('⚠️ Razorpay SDK not linked or available');
                                    throw new Error('Razorpay is not available on this device');
                                }

                                console.log('🚀 Initiating Razorpay flow...');
                                // 1. Create Order via Backend
                                const orderResponse = await apiClient.post('/create-order', {
                                    user_id: user.id,
                                    tier: plan.id
                                });

                                const { id: order_id, amount, currency, key_id } = orderResponse.data;

                                // 2. Open Razorpay SDK
                                const options = {
                                    description: `LazarFlow ${plan.name} Subscription`,
                                    image: 'https://api.lazarflow.app/logo.png', // Replace with actual logo
                                    currency: currency || 'INR',
                                    key: key_id, // Backend should provide the public key
                                    amount: amount,
                                    name: 'LazarFlow',
                                    order_id: order_id,
                                    prefill: {
                                        email: user.email,
                                        contact: '',
                                        name: user.user_metadata?.full_name || ''
                                    },
                                    theme: { color: Theme.colors.accent }
                                };

                                if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
                                    throw new Error('Razorpay SDK is not initialized correctly');
                                }

                                const razorpayData = await RazorpayCheckout.open(options);
                                console.log('✅ Razorpay Success:', razorpayData);

                                // 3. Verify Payment via Backend
                                const verifyResponse = await apiClient.post('/verify-payment', {
                                    razorpay_order_id: razorpayData.razorpay_order_id,
                                    razorpay_payment_id: razorpayData.razorpay_payment_id,
                                    razorpay_signature: razorpayData.razorpay_signature
                                });

                                if (verifyResponse.status === 200) {
                                    navigation.navigate('PaymentStatus', {
                                        status: 'success',
                                        orderId: razorpayData.razorpay_order_id,
                                        planName: plan.name
                                    });
                                    return;
                                }
                            } catch (rpError) {
                                if (rpError.code === 2) { // 2 is usually user cancellation
                                    return; 
                                }

                                if (!isCashfreeAvailable) {
                                    console.log('⚠️ Razorpay failed and Cashfree is not available:', rpError);
                                    navigation.navigate('PaymentStatus', {
                                        status: 'failure',
                                        message: rpError.message || 'Razorpay payment failed and no fallback available.'
                                    });
                                    return;
                                }

                                console.log('⚠️ Razorpay failed, trying Cashfree fallback...', rpError);
                            }

                            if (isCashfreeAvailable) {
                                // --- CASHFREE FLOW (FALLBACK) ---
                                console.log('🔄 Initiating Cashfree fallback...');
                                // 1. Create Cashfree Order via Backend
                                const cfResponse = await fetch('https://api.lazarflow.app/create-order-cashfree', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ user_id: user.id, tier: plan.id }),
                                });

                                const cfData = await cfResponse.json();
                                if (!cfResponse.ok) throw new Error(cfData.message || 'Failed to create Cashfree order');

                                const { payment_session_id, order_id: cf_order_id } = cfData;

                                // 2. Start Cashfree Checkout
                                try {
                                    if (!CFPaymentGatewayService || typeof CFPaymentGatewayService.doPayment !== 'function') {
                                        throw new Error('Cashfree SDK is not initialized correctly');
                                    }

                                    CFPaymentGatewayService.doPayment({
                                        environment: 'PRODUCTION',
                                        payment_session_id: payment_session_id,
                                        order_id: cf_order_id || "ORDER_ID_NOT_PROVIDED",
                                    });
                                } catch (cfDoError) {
                                    console.error('Cashfree doPayment error:', cfDoError);
                                    throw new Error('Failed to open Cashfree payment gateway');
                                }
                            }

                        } catch (error) {
                            console.error('Error initiating payment:', error);
                            navigation.navigate('PaymentStatus', {
                                status: 'failure',
                                message: error.message || 'Failed to initiate payment. Please try again later.'
                            });
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { paddingTop: isTab ? 0 : insets.top, paddingBottom: isTab ? 0 : insets.bottom }]}>
            <StatusBar barStyle="dark-content" />
            {!isTab && (
                <View style={styles.topHeader}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft size={24} color={Theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.topHeaderTitle}>Premium Plans</Text>
                    <View style={{ width: 40 }} />
                </View>
            )}

            <ScrollView
                contentContainerStyle={[styles.scrollContent, isTab && { paddingBottom: 100 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <LinearGradient
                        colors={[Theme.colors.accent + '15', 'transparent']}
                        style={styles.headerGradient}
                    />
                    <Sparkles size={32} color={Theme.colors.accent} style={styles.headerIcon} />
                    <Text style={styles.title}>Elevate Your Experience</Text>
                    <Text style={styles.subtitle}>Unlock professional tools to manage your gaming lobbies with ease.</Text>
                </View>

                {plans.map((plan) => (
                    <TouchableOpacity
                        key={plan.id}
                        style={[
                            styles.planCard,
                            plan.isPopular && styles.popularCard,
                            plan.isCurrent && { borderColor: plan.color, borderWidth: 2 }
                        ]}
                        activeOpacity={0.9}
                        onPress={() => handleClaim(plan)}
                    >
                        {plan.isPopular && (
                            <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                                <Star size={12} color="#fff" fill="#fff" />
                                <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                            </View>
                        )}

                        <View style={styles.planHeader}>
                            <View style={[styles.iconContainer, { backgroundColor: plan.color + '15' }]}>
                                {plan.icon}
                            </View>
                            <View style={styles.planInfo}>
                                <Text style={styles.planName}>{plan.name}</Text>
                                <View style={styles.priceContainer}>
                                    <Text style={styles.planPrice}>{plan.price}</Text>
                                    <Text style={styles.planPeriod}> / {plan.period}</Text>
                                </View>
                            </View>
                            {plan.isCurrent && (
                                <View style={[styles.currentBadge, { backgroundColor: plan.color + '20' }]}>
                                    <Text style={[styles.currentBadgeText, { color: plan.color }]}>Active</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.featuresList}>
                            {plan.features.map((feature, index) => (
                                <View key={index} style={styles.featureItem}>
                                    <View style={[styles.checkContainer, { backgroundColor: plan.color + '10' }]}>
                                        <Check size={12} color={plan.color} strokeWidth={3} />
                                    </View>
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            ))}
                        </View>

                        <LinearGradient
                            colors={plan.isCurrent ? [Theme.colors.secondary, Theme.colors.secondary] : [plan.color, plan.color + 'CC']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.claimBtnGradient}
                        >
                            <View
                                style={[
                                    styles.claimBtn,
                                    plan.isCurrent && { backgroundColor: 'transparent', borderWidth: 1, borderColor: plan.color }
                                ]}
                            >
                                <Text style={[
                                    styles.claimBtnText,
                                    { color: plan.isCurrent ? plan.color : '#fff' }
                                ]}>
                                    {plan.isCurrent ? 'Current Plan' : 'Get Started'}
                                </Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                ))}

                {/* Trust Indicators */}
                <View style={styles.footer}>
                    <ShieldCheck size={20} color={Theme.colors.textSecondary} />
                    <Text style={styles.footerText}>Secure payment processing. Cancel anytime.</Text>
                </View>

                {/* FAQ Section */}
                <View style={styles.faqSection}>
                    <Text style={styles.faqTitle}>Frequently Asked Questions</Text>

                    <View style={styles.faqItem}>
                        <Text style={styles.faqQuestion}>Can I change my plan later?</Text>
                        <Text style={styles.faqAnswer}>Yes, you can upgrade or downgrade your plan at any time from your account settings.</Text>
                    </View>

                    <View style={styles.faqItem}>
                        <Text style={styles.faqQuestion}>What happens to my data if I cancel?</Text>
                        <Text style={styles.faqAnswer}>Your data remains safe. If you downgrade to a free plan, you'll simply be restricted to the free tier limits.</Text>
                    </View>

                    <View style={styles.faqItem}>
                        <Text style={styles.faqQuestion}>Is there a limit on custom layouts?</Text>
                        <Text style={styles.faqAnswer}>Premium plans offer multiple layout slots so you can switch between different designs instantly.</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: Theme.colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    backBtn: {
        padding: 8,
    },
    topHeaderTitle: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
        paddingTop: 10,
        position: 'relative',
    },
    headerGradient: {
        position: 'absolute',
        top: -20,
        left: -20,
        right: -20,
        height: 200,
    },
    headerIcon: {
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 22,
        fontFamily: Theme.fonts.outfit.regular,
    },
    planCard: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 4,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        position: 'relative',
        overflow: 'hidden',
    },
    popularCard: {
        borderColor: '#f59e0b',
        borderWidth: 2,
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 8,
    },
    popularBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderBottomLeftRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    popularBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.bold,
        letterSpacing: 0.5,
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    planInfo: {
        flex: 1,
    },
    planName: {
        fontSize: 22,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        marginBottom: 2,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    planPrice: {
        fontSize: 20,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
    },
    planPeriod: {
        fontSize: 14,
        color: Theme.colors.textSecondary,
        fontFamily: Theme.fonts.outfit.medium,
    },
    currentBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    currentBadgeText: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.bold,
        textTransform: 'uppercase',
    },
    featuresList: {
        marginBottom: 24,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    checkContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    featureText: {
        fontSize: 15,
        color: Theme.colors.textSecondary,
        fontFamily: Theme.fonts.outfit.medium,
    },
    claimBtnGradient: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    claimBtn: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    claimBtnText: {
        fontSize: 17,
        fontFamily: Theme.fonts.outfit.bold,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 10,
        marginBottom: 20,
    },
    footerText: {
        fontSize: 13,
        color: Theme.colors.textSecondary,
        fontFamily: Theme.fonts.outfit.medium,
    },
    faqSection: {
        marginTop: 40,
        paddingTop: 40,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
        paddingBottom: 40,
    },
    faqTitle: {
        fontSize: 20,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        marginBottom: 24,
        textAlign: 'center',
    },
    faqItem: {
        marginBottom: 24,
    },
    faqQuestion: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        marginBottom: 8,
    },
    faqAnswer: {
        fontSize: 14,
        color: Theme.colors.textSecondary,
        lineHeight: 20,
        fontFamily: Theme.fonts.outfit.regular,
    },
});

export default SubscriptionPlansScreen;
