import React, { useContext, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Dimensions, TextInput, NativeModules } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ArrowLeft, Zap, ShoppingBag, TrendingUp, Cpu, ShieldCheck } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { UserContext } from '../../context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import RazorpayCheckout from 'react-native-razorpay';
import apiClient from '../../lib/apiClient';
import { CustomAlert as Alert } from '../../lib/AlertService';

interface SubscriptionPlansPageProps {
    navigation: any;
    route?: {
        params?: {
            isTab?: boolean;
        };
    };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const SubscriptionPlansPage: React.FC<SubscriptionPlansPageProps> = ({ navigation, route }) => {
    const isTab = route?.params?.isTab || false;
    const { user, refreshUser } = useContext(UserContext);
    const [customAmount, setCustomAmount] = useState('250');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCustomFocused, setIsCustomFocused] = useState(false);

    const PRICE_PER_CREDIT = 3;

    // Check if Razorpay is linked/available
    const isRazorpayAvailable = useMemo(() => {
        try {
            const hasJS = !!RazorpayCheckout && typeof RazorpayCheckout.open === 'function';
            const nativeModule = NativeModules.RazorpayCheckout || NativeModules.RNRazorpayCheckout || NativeModules.RNRazorpay;
            const hasNative = !!nativeModule;
            
            console.log('💳 Payment Gateway Detection:');
            console.log('   - JS Library available:', hasJS);
            console.log('   - Native Module available:', hasNative);
            if (!hasNative) {
                console.log('   - Available NativeModules:', Object.keys(NativeModules).filter(k => k.toLowerCase().includes('razor') || k.includes('Pay')));
            }
            
            return hasJS && hasNative;
        } catch (e) {
            console.error('❌ Error checking Razorpay availability:', e);
            return false;
        }
    }, []);

    const creditPacks = [
        {
            id: 'starter',
            name: 'Starter Pack',
            amount: 20,
            tagline: 'Perfect for a weekend cup',
            icon: <Zap size={24} color="#64748b" />,
            color: '#64748b',
            gradient: ['#94a3b8', '#64748b']
        },
        {
            id: 'pro',
            name: 'Pro Streamer',
            amount: 100,
            tagline: 'Best for daily scrims',
            icon: <TrendingUp size={24} color="#3b82f6" />,
            color: '#3b82f6',
            isPopular: true,
            gradient: ['#3b82f6', '#1d4ed8']
        },
        {
            id: 'elite',
            name: 'Elite League',
            amount: 350,
            tagline: 'Full seasonal coverage',
            icon: <Cpu size={24} color="#f59e0b" />,
            color: '#f59e0b',
            gradient: ['#f59e0b', '#d97706']
        }
    ];

    const calculatePrice = (amount: string | number) => {
        const num = parseInt(String(amount)) || 0;
        return num * PRICE_PER_CREDIT;
    };

    const handlePurchase = async (amount: string | number) => {
        const totalAmount = parseInt(String(amount));
        if (isNaN(totalAmount) || totalAmount < 1) {
            Alert.alert('Invalid Amount', 'Minimum purchase is 1 Credit.');
            return;
        }

        try {
            if (!user) throw new Error('User not found');
            if (!isRazorpayAvailable) throw new Error(`Payment gateway unavailable.`);

            setIsProcessing(true);
            const price = calculatePrice(totalAmount);

            console.log(`🚀 Initiating Credit Purchase: ${totalAmount} Units for ₹${price}`);
            
            const orderResponse = await apiClient.post('/api/payments/create-flux-order', {
                flux_amount: totalAmount,
                price_in_inr: price
            });

            console.log('📦 Order Response Data:', JSON.stringify(orderResponse.data, null, 2));

            if (!orderResponse.data || !orderResponse.data.order_id) {
                console.error('❌ Order Creation Failed:', orderResponse.data);
                throw new Error('Failed to create payment order.');
            }

            const { order_id, amount: amountInPaise, currency, key_id } = orderResponse.data;

            // Handle email array vs string
            const userEmail = Array.isArray(user.email) ? user.email[0] : user.email;
            const userName = user.display_name || user.username || 'LazarFlow User';

            const options = {
                description: `Purchase ${totalAmount} AI Credits`,
                image: 'https://lazarflow.app/logo.png',
                currency: currency || 'INR',
                key: key_id,
                amount: amountInPaise,
                name: 'LazarFlow',
                order_id: order_id,
                prefill: {
                    email: userEmail || '',
                    contact: user.phone || '',
                    name: userName
                },
                theme: { color: Theme.colors.accent }
            };

            console.log('💳 Opening Razorpay Checkout with options:', { ...options, key: '***', order_id: options.order_id });
            const razorpayData = await RazorpayCheckout.open(options);
            
            console.log('🔍 Verifying Flux Purchase...');
            const verifyResponse = await apiClient.post('/api/payments/verify-flux-purchase', {
                flux_amount: totalAmount,
                gateway: 'razorpay',
                razorpay_order_id: razorpayData.razorpay_order_id,
                razorpay_payment_id: razorpayData.razorpay_payment_id,
                razorpay_signature: razorpayData.razorpay_signature
            });

            if (verifyResponse.status === 200 || verifyResponse.status === 201) {
                if (refreshUser) await refreshUser();
                navigation.navigate('PaymentStatus', {
                    status: 'success',
                    orderId: razorpayData.razorpay_order_id,
                    message: `Successfully added ${totalAmount} Credits to your account!`,
                    planName: `${totalAmount} Credits`
                });
            }
        } catch (error: any) {
            console.error('❌ Purchase Error:', error);
            
            let errorMessage = error.message || 'Transaction failed';
            let status = 'failed';

            if (error.code === 2) {
                console.log('👤 Payment cancelled by user');
                status = 'cancelled';
                errorMessage = 'Payment was cancelled by the user.';
            } else if (typeof error === 'object' && error.description) {
                try {
                    const parsedError = JSON.parse(error.description);
                    errorMessage = parsedError.error?.description || errorMessage;
                } catch (e) {
                    errorMessage = error.description || errorMessage;
                }
            }

            navigation.navigate('PaymentStatus', {
                status: status,
                message: errorMessage,
                orderId: null
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, isTab && { paddingTop: 0 }]} edges={isTab ? [] : ['top']}>
            <StatusBar barStyle="dark-content" />
            {!isTab && (
                <View style={styles.topHeader}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft size={24} color="#0f172a" />
                    </TouchableOpacity>
                    <Text style={styles.topHeaderTitle}>Credit Store</Text>
                    <View style={styles.balanceBadge}>
                        <Zap size={12} color="#f59e0b" fill="#f59e0b" />
                        <Text style={styles.balanceText}>{user?.flux_balance || 0}</Text>
                    </View>
                </View>
            )}

            <ScrollView
                contentContainerStyle={[styles.scrollContent, isTab && { paddingBottom: 100 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View style={styles.headerBadge}>
                        <Zap size={12} color={Theme.colors.accent} fill={Theme.colors.accent} />
                        <Text style={styles.headerBadgeText}>PREMIUM AI CREDITS</Text>
                    </View>
                    <Text style={styles.title}>Lazar Credits</Text>
                    <Text style={styles.subtitle}>Power your tournament automation with Credits. Pay only for what you use, when you use it.</Text>
                </View>

                <View style={styles.individualContainer}>
                    <View style={styles.customCardHighlighted}>
                        <View style={styles.customHeader}>
                            <View style={styles.flexRowCenter}>
                                <ShoppingBag size={20} color={Theme.colors.accent} />
                                <Text style={styles.customTitle}>Flexible Credits</Text>
                            </View>
                            <View style={styles.proBadge}>
                                <Text style={styles.proBadgeText}>ANY AMOUNT</Text>
                            </View>
                        </View>
                        <Text style={styles.customSub}>Enter the exact number of credits you need (min. 1).</Text>
                        
                        <View style={[styles.inputWrapper, isCustomFocused && styles.inputWrapperFocused]}>
                            <TextInput
                                style={styles.fluxInput as any}
                                keyboardType="numeric"
                                value={customAmount}
                                onChangeText={setCustomAmount}
                                onFocus={() => setIsCustomFocused(true)}
                                onBlur={() => setIsCustomFocused(false)}
                                placeholder="0"
                                placeholderTextColor="rgba(15, 23, 42, 0.2)"
                            />
                            <View style={styles.fluxInputLabel}>
                                <Zap size={16} color="#f59e0b" fill="#f59e0b" />
                                <Text style={styles.fluxInputLabelText}>Credits</Text>
                            </View>
                        </View>

                        <View style={styles.priceSummary}>
                            <Text style={styles.priceSummaryLabel}>Total Price</Text>
                            <Text style={styles.priceSummaryVal}>₹{calculatePrice(customAmount)}</Text>
                        </View>

                        <TouchableOpacity 
                            style={styles.customBuyBtn}
                            onPress={() => handlePurchase(customAmount)}
                            disabled={isProcessing}
                        >
                            <LinearGradient
                                colors={['#0f172a', '#1e293b']}
                                style={styles.fullBtnGradient}
                            >
                                <Text style={styles.fullBtnText}>Purchase Credits</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionDividerText}>OR CHOOSE A QUICK PACK</Text>

                    <View style={styles.packsGrid}>
                        {creditPacks.map((pack) => (
                            <TouchableOpacity
                                key={pack.id}
                                style={[styles.packCard, pack.isPopular && styles.popularCard, isProcessing && { opacity: 0.6 }]}
                                activeOpacity={0.9}
                                onPress={() => handlePurchase(pack.amount)}
                                disabled={isProcessing}
                            >
                                {pack.isPopular && (
                                    <View style={styles.popularRibbon}>
                                        <Text style={styles.popularRibbonText}>BEST VALUE</Text>
                                    </View>
                                )}
                                <View style={[styles.iconWrapper, { backgroundColor: pack.color + '15' }]}>
                                    {pack.icon}
                                </View>
                                <View style={styles.packContent}>
                                    <View>
                                        <Text style={styles.packAmount}>{pack.amount} Credits</Text>
                                        <Text style={styles.packName}>{pack.name}</Text>
                                    </View>
                                    <View style={styles.priceTag}>
                                        <Text style={styles.priceTagVal}>₹{calculatePrice(pack.amount)}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>Why use Credits?</Text>
                    <View style={styles.benefitRow}>
                        <Check size={14} color="#10b981" />
                        <Text style={styles.benefitText}>1 Credit = 1 Full AI Match Automation</Text>
                    </View>
                    <View style={styles.benefitRow}>
                        <Check size={14} color="#10b981" />
                        <Text style={styles.benefitText}>No monthly fee. Credits never expire.</Text>
                    </View>
                    <View style={styles.benefitRow}>
                        <Check size={14} color="#10b981" />
                        <Text style={styles.benefitText}>Use on any lobby, any game, anytime.</Text>
                    </View>
                </View>

                <View style={styles.trustBox}>
                    <ShieldCheck size={16} color="#64748b" />
                    <Text style={styles.trustText}>Secure checkout via Razorpay</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backBtn: { padding: 4 },
    topHeaderTitle: { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a' },
    balanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#ffedd5', gap: 6 },
    balanceText: { fontSize: 14, fontFamily: Theme.fonts.outfit.bold, color: '#c2410c' },
    scrollContent: { padding: 20 },
    header: { alignItems: 'center', marginBottom: 30 },
    headerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, marginBottom: 16 },
    headerBadgeText: { fontSize: 9, fontFamily: Theme.fonts.outfit.bold, color: '#64748b', letterSpacing: 1 },
    title: { fontSize: 32, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a', textAlign: 'center' },
    subtitle: { fontSize: 14, fontFamily: Theme.fonts.outfit.regular, color: '#64748b', textAlign: 'center', marginTop: 10, lineHeight: 20, paddingHorizontal: 20 },
    individualContainer: { gap: 20 },
    customCardHighlighted: { backgroundColor: '#f8fafc', borderRadius: 24, padding: 20, borderWidth: 2, borderColor: Theme.colors.accent, shadowColor: Theme.colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
    customHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    flexRowCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    customTitle: { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a' },
    proBadge: { backgroundColor: Theme.colors.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    proBadgeText: { color: '#fff', fontSize: 9, fontFamily: Theme.fonts.outfit.bold },
    customSub: { fontSize: 13, color: '#64748b', marginBottom: 20 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, height: 60 },
    inputWrapperFocused: { borderColor: Theme.colors.accent, borderWidth: 2, backgroundColor: '#fff' },
    fluxInput: { flex: 1, fontSize: 24, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a' },
    fluxInputLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    fluxInputLabelText: { fontSize: 14, fontFamily: Theme.fonts.outfit.bold, color: '#f59e0b' },
    priceSummary: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, alignItems: 'center' },
    priceSummaryLabel: { fontSize: 14, color: '#64748b', fontFamily: Theme.fonts.outfit.medium },
    priceSummaryVal: { fontSize: 24, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.accent },
    customBuyBtn: { marginTop: 20, height: 54, borderRadius: 14, overflow: 'hidden' },
    fullBtnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    fullBtnText: { color: '#fff', fontSize: 16, fontFamily: Theme.fonts.outfit.bold },
    sectionDividerText: { fontSize: 11, fontFamily: Theme.fonts.outfit.bold, color: '#94a3b8', textAlign: 'center', letterSpacing: 1, marginVertical: 10 },
    packsGrid: { gap: 12 },
    packCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', position: 'relative', overflow: 'hidden' },
    popularCard: { borderColor: '#3b82f6', borderWidth: 2 },
    popularRibbon: { position: 'absolute', top: 0, right: 0, backgroundColor: '#3b82f6', paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: 10 },
    popularRibbonText: { color: '#fff', fontSize: 8, fontFamily: Theme.fonts.outfit.bold },
    iconWrapper: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    packContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    packAmount: { fontSize: 22, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a' },
    packName: { fontSize: 14, color: '#64748b', fontFamily: Theme.fonts.outfit.medium },
    priceTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    priceTagVal: { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a' },
    infoBox: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 20, marginTop: 30, borderWidth: 1, borderColor: '#e2e8f0' },
    infoTitle: { fontSize: 16, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a', marginBottom: 15 },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    benefitText: { fontSize: 13, color: '#475569' },
    trustBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, marginBottom: 40 },
    trustText: { fontSize: 12, color: '#94a3b8' }
});
