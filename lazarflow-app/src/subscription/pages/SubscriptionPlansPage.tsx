import React, { useContext, useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, Dimensions, TextInput, NativeModules, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ArrowLeft, Zap, ShoppingBag, TrendingUp, Cpu, ShieldCheck, Play, Tv, Crown, Calendar, Infinity as InfinityIcon, Clock, Star } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { UserContext } from '../../context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import RazorpayCheckout from 'react-native-razorpay';
import apiClient, { extractApiErrorMessage } from '../../lib/apiClient';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { useEarnCreditRewardedAd } from '../../hooks/useEarnCreditRewardedAd';
import { AD_PLACEMENTS } from '../../config/adConfig';

type StoreTab = 'credits' | 'subscriptions';

const SUBSCRIPTION_PLANS = [
    {
        id: 'daily',
        name: 'Daily',
        tagline: 'Perfect for tournament day',
        duration: '24 Hours',
        price: 30,
        accent: '#06b6d4',
        gradColors: ['#06b6d4', '#0891b2'] as [string, string],
        icon: <Clock size={22} color="#06b6d4" />,
        perks: ['Unlimited AI match automation', 'Unlimited lobby processing', 'Valid for 24 hours'],
    },
    {
        id: 'weekly',
        name: 'Weekly',
        tagline: 'Best for weekly scrims',
        duration: '7 Days',
        price: 100,
        accent: '#1A73E8',
        gradColors: ['#1A73E8', '#1557B0'] as [string, string],
        icon: <Star size={22} color="#1A73E8" />,
        perks: ['Unlimited AI match automation', 'Unlimited lobby processing', 'Valid for 7 days'],
        popular: true,
    },
    {
        id: 'monthly',
        name: 'Monthly',
        tagline: 'Full season domination',
        duration: '30 Days',
        price: 250,
        accent: '#f59e0b',
        gradColors: ['#f59e0b', '#d97706'] as [string, string],
        icon: <Crown size={22} color="#f59e0b" />,
        perks: ['Unlimited AI match automation', 'Unlimited lobby processing', 'Priority processing queue', 'Valid for 30 days'],
    },
];

interface SubscriptionPlansPageProps {
    navigation: any;
    route?: { params?: { isTab?: boolean } };
}

const formatPaymentError = (err: any): string => {
    if (!err) return 'An unexpected error occurred during payment. Please try again.';

    // User cancelled
    if (err.code === 2 || err.code === '2' || err.message === 'Payment Cancelled') {
        return 'Payment was cancelled. You have not been charged.';
    }

    // Backend API errors carry {"detail": {message, code}} — surface the real
    // reason (e.g. "This payment has already been used.") before Razorpay's.
    const apiMsg = err?.response?.data?.detail;
    if (apiMsg && typeof apiMsg === 'object' && typeof apiMsg.message === 'string') {
        return apiMsg.message;
    }
    if (typeof apiMsg === 'string' && apiMsg.trim() && !apiMsg.includes('{')) {
        return apiMsg;
    }

    // Razorpay error description could be raw string or JSON
    let raw = err.description || err.error?.description || err.message || '';

    // If description is a stringified JSON like {"error":{"code":"BAD_REQUEST_ERROR","description":"..."}}
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (parsed.error?.description) raw = parsed.error.description;
                else if (parsed.description) raw = parsed.description;
                else if (parsed.message) raw = parsed.message;
            } catch (_) {}
        }
    } else if (typeof raw === 'object' && raw !== null) {
        if (raw.description) raw = raw.description;
        else if (raw.message) raw = raw.message;
        else raw = JSON.stringify(raw);
    }

    if (!raw || typeof raw !== 'string' || raw.trim() === '' || raw.includes('{')) {
        return 'Payment could not be completed. If money was deducted, it will be refunded to your account within 3-5 business days.';
    }

    // Common readable mappings
    const lower = raw.toLowerCase();
    if (lower.includes('cancelled') || lower.includes('canceled')) {
        return 'Payment was cancelled. You have not been charged.';
    }
    if (lower.includes('network') || lower.includes('connection') || lower.includes('timeout')) {
        return 'Network connection issue. Please check your internet and try again.';
    }
    if (lower.includes('declined') || lower.includes('insufficient')) {
        return 'Payment was declined by your bank or UPI app. Please verify your balance and try another payment method.';
    }

    return raw;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRICE_PER_CREDIT = 1;

export const SubscriptionPlansPage: React.FC<SubscriptionPlansPageProps> = ({ navigation, route }) => {
    const isTab = route?.params?.isTab || false;
    const { user, refreshUser } = useContext(UserContext);
    const [activeTab, setActiveTab] = useState<StoreTab>('credits');
    const [customAmount, setCustomAmount] = useState('250');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCustomFocused, setIsCustomFocused] = useState(false);
    const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

    // Derive active subscription info from user
    const activeSub = useMemo(() => {
        const tier = user?.subscription_tier?.toLowerCase();
        const expiresAt = user?.subscription_expires_at;
        if (!tier || tier === 'free' || !expiresAt) return null;
        const expiryDate = new Date(expiresAt);
        if (expiryDate <= new Date()) return null;
        return { tier, expiresAt: expiryDate };
    }, [user]);

    const handleSubscriptionPurchase = async (plan: typeof SUBSCRIPTION_PLANS[0]) => {
        try {
            if (!user) throw new Error('User not found');
            if (!isRazorpayAvailable) throw new Error('Payment gateway unavailable.');
            setProcessingPlanId(plan.id);
            const orderRes = await apiClient.post('/api/payments/create-subscription-order', {
                plan_id: plan.id,
                price_in_inr: plan.price,
            });
            if (!orderRes.data?.order_id) throw new Error('Failed to create order.');
            const { order_id, amount: paise, currency, key_id } = orderRes.data;
            const email = Array.isArray(user.email) ? user.email[0] : user.email;
            const razorData = await RazorpayCheckout.open({
                description: `${plan.name} Subscription — Unlimited AI`,
                image: 'https://lazarflow.app/logo.png',
                currency: currency || 'INR',
                key: key_id, amount: paise, name: 'LazarFlow', order_id,
                prefill: { email: email || '', contact: user.phone || '', name: user.display_name || user.username || 'LazarFlow User' },
                theme: { color: plan.accent },
            });
            const verifyRes = await apiClient.post('/api/payments/verify-subscription-purchase', {
                plan_id: plan.id,
                gateway: 'razorpay',
                razorpay_order_id: razorData.razorpay_order_id,
                razorpay_payment_id: razorData.razorpay_payment_id,
                razorpay_signature: razorData.razorpay_signature,
            });
            if (verifyRes.status === 200 || verifyRes.status === 201) {
                if (refreshUser) await refreshUser();
                navigation.navigate('PaymentStatus', {
                    status: 'success',
                    orderId: razorData.razorpay_order_id,
                    message: `${plan.name} subscription activated! Unlimited AI for ${plan.duration}.`,
                    planName: `${plan.name} Subscription`,
                });
            }
        } catch (err: any) {
            const isCancelled = err?.code === 2 || err?.code === '2';
            const status = isCancelled ? 'cancelled' : 'failed';
            const msg = formatPaymentError(err);
            navigation.navigate('PaymentStatus', { status, message: msg, orderId: null });
        } finally { setProcessingPlanId(null); }
    };

    const { progress, watchAd } = useEarnCreditRewardedAd({
        onCreditEarned: (newBalance) => {
            if (refreshUser) refreshUser();
            Alert.alert('🎉 Credit Earned!', `You earned 1 Credit! Balance: ${newBalance}`);
        },
        onError: (msg) => Alert.alert('Ad Error', msg),
    });

    const isRazorpayAvailable = useMemo(() => {
        try {
            const hasJS = !!RazorpayCheckout && typeof RazorpayCheckout.open === 'function';
            const native = NativeModules.RazorpayCheckout || NativeModules.RNRazorpayCheckout || NativeModules.RNRazorpay;
            return hasJS && !!native;
        } catch { return false; }
    }, []);

    const creditPacks = [
        { id: 'starter', name: 'Starter', amount: 20,  tagline: 'Weekend cup',      icon: <Zap size={20} color="#94a3b8" />,      accent: '#94a3b8' },
        { id: 'pro',     name: 'Pro',     amount: 100, tagline: 'Daily scrims',      icon: <TrendingUp size={20} color="#1A73E8" />, accent: '#1A73E8', popular: true },
        { id: 'elite',   name: 'Elite',   amount: 350, tagline: 'Full season',       icon: <Cpu size={20} color="#f59e0b" />,       accent: '#f59e0b' },
    ];

    const price = (amt: string | number) => (parseInt(String(amt)) || 0) * PRICE_PER_CREDIT;

    const handlePurchase = async (amount: string | number) => {
        const total = parseInt(String(amount));
        if (isNaN(total) || total < 1) { Alert.alert('Invalid', 'Minimum 1 Credit.'); return; }
        try {
            if (!user) throw new Error('User not found');
            if (!isRazorpayAvailable) throw new Error('Payment gateway unavailable.');
            setIsProcessing(true);
            const orderRes = await apiClient.post('/api/payments/create-flux-order', {
                flux_amount: total, price_in_inr: price(total),
            });
            if (!orderRes.data?.order_id) throw new Error('Failed to create order.');
            const { order_id, amount: paise, currency, key_id } = orderRes.data;
            const email = Array.isArray(user.email) ? user.email[0] : user.email;
            const razorData = await RazorpayCheckout.open({
                description: `Purchase ${total} AI Credits`,
                image: 'https://lazarflow.app/logo.png',
                currency: currency || 'INR',
                key: key_id, amount: paise, name: 'LazarFlow', order_id,
                prefill: { email: email || '', contact: user.phone || '', name: user.display_name || user.username || 'LazarFlow User' },
                theme: { color: Theme.colors.accent },
            });
            const verifyRes = await apiClient.post('/api/payments/verify-flux-purchase', {
                flux_amount: total, gateway: 'razorpay',
                razorpay_order_id: razorData.razorpay_order_id,
                razorpay_payment_id: razorData.razorpay_payment_id,
                razorpay_signature: razorData.razorpay_signature,
            });
            if (verifyRes.status === 200 || verifyRes.status === 201) {
                if (refreshUser) await refreshUser();
                navigation.navigate('PaymentStatus', { status: 'success', orderId: razorData.razorpay_order_id, message: `Added ${total} Credits!`, planName: `${total} Credits` });
            }
        } catch (err: any) {
            const isCancelled = err?.code === 2 || err?.code === '2';
            const status = isCancelled ? 'cancelled' : 'failed';
            const msg = formatPaymentError(err);
            navigation.navigate('PaymentStatus', { status, message: msg, orderId: null });
        } finally { setIsProcessing(false); }
    };

    // ── Progress dots ──────────────────────────────────────────────────────
    const adsRequired = AD_PLACEMENTS.EARN_CREDIT_REWARDED.adsPerCredit;
    const adsWatched = progress.isLoading ? 0 : progress.adsWatched;
    const fillPct = `${Math.round((adsWatched / adsRequired) * 100)}%`;

    return (
        <SafeAreaView style={[styles.container, isTab && { paddingTop: 0 }]} edges={isTab ? [] : ['top']}>
            <StatusBar barStyle="dark-content" />

            {!isTab && (
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft size={22} color={Theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.topBarTitle}>Store</Text>
                    <View style={styles.balancePill}>
                        <Zap size={12} color="#f59e0b" fill="#f59e0b" />
                        <Text style={styles.balanceVal}>{user?.flux_balance ?? 0}</Text>
                    </View>
                </View>
            )}

            {/* ── Tab Switcher ──────────────────────────────────────── */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'credits' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('credits')}
                >
                    <Zap size={14} color={activeTab === 'credits' ? '#fff' : Theme.colors.textSecondary} />
                    <Text style={[styles.tabBtnText, activeTab === 'credits' && styles.tabBtnTextActive]}>Credits</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'subscriptions' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('subscriptions')}
                >
                    <Crown size={14} color={activeTab === 'subscriptions' ? '#fff' : Theme.colors.textSecondary} />
                    <Text style={[styles.tabBtnText, activeTab === 'subscriptions' && styles.tabBtnTextActive]}>Unlimited</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[styles.scroll, isTab && { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>

                {activeTab === 'credits' ? (
                <>
                {/* ── Credits Hero ─────────────────────────────────── */}
                <View style={styles.hero}>
                    <View style={styles.heroPill}>
                        <Zap size={11} color={Theme.colors.accent} fill={Theme.colors.accent} />
                        <Text style={styles.heroPillText}>AI CREDITS</Text>
                    </View>
                    <Text style={styles.heroTitle}>Lazar Credits</Text>
                    <Text style={styles.heroSub}>Pay per use. No subscriptions. Credits never expire.</Text>
                </View>

                {/* ── Custom amount ──────────────────────────────────── */}
                <View style={styles.card}>
                    <View style={styles.cardRowBetween}>
                        <View style={styles.row}>
                            <ShoppingBag size={18} color={Theme.colors.accent} />
                            <Text style={styles.cardTitle}>Custom Amount</Text>
                        </View>
                        <View style={styles.pill}>
                            <Text style={styles.pillText}>ANY AMOUNT</Text>
                        </View>
                    </View>
                    <Text style={styles.cardSub}>Enter exactly how many credits you need (min. 1).</Text>

                    <View style={[styles.inputRow, isCustomFocused && styles.inputRowFocused]}>
                        <TextInput
                            style={styles.input as any}
                            keyboardType="numeric"
                            value={customAmount}
                            onChangeText={setCustomAmount}
                            onFocus={() => setIsCustomFocused(true)}
                            onBlur={() => setIsCustomFocused(false)}
                            placeholder="0"
                            placeholderTextColor={Theme.colors.textSecondary + '60'}
                        />
                        <View style={styles.row}>
                            <Zap size={15} color="#f59e0b" fill="#f59e0b" />
                            <Text style={styles.inputUnit}>Credits</Text>
                        </View>
                    </View>

                    <View style={styles.cardRowBetween}>
                        <Text style={styles.priceLabel}>Total</Text>
                        <Text style={styles.priceVal}>₹{price(customAmount)}</Text>
                    </View>

                    <TouchableOpacity style={styles.buyBtn} onPress={() => handlePurchase(customAmount)} disabled={isProcessing} activeOpacity={0.88}>
                        <LinearGradient colors={[Theme.colors.accent, '#1557B0']} style={styles.buyBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            {isProcessing
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.buyBtnText}>Purchase Credits</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* ── Divider ────────────────────────────────────────── */}
                <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR QUICK PACK</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* ── Credit packs ───────────────────────────────────── */}
                <View style={styles.packsCol}>
                    {creditPacks.map((pack) => (
                        <TouchableOpacity
                            key={pack.id}
                            style={[styles.packCard, pack.popular && { borderColor: Theme.colors.accent, borderWidth: 2 }]}
                            onPress={() => handlePurchase(pack.amount)}
                            disabled={isProcessing}
                            activeOpacity={0.85}
                        >
                            {pack.popular && (
                                <View style={styles.popularRibbon}>
                                    <Text style={styles.popularRibbonText}>BEST VALUE</Text>
                                </View>
                            )}
                            <View style={[styles.packIcon, { backgroundColor: pack.accent + '18' }]}>
                                {pack.icon}
                            </View>
                            <View style={styles.packMid}>
                                <Text style={styles.packCredits}>{pack.amount} Credits</Text>
                                <Text style={styles.packName}>{pack.name} · {pack.tagline}</Text>
                            </View>
                            <View style={[styles.packPricePill, { backgroundColor: pack.accent + '15' }]}>
                                <Text style={[styles.packPrice, { color: pack.accent }]}>₹{price(pack.amount)}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Earn Free Credits ──────────────────────────────── */}
                <View style={styles.earnSection}>
                    <View style={styles.earnTopRow}>
                        <View style={styles.row}>
                            <View style={styles.earnIconBox}>
                                <Tv size={16} color={Theme.colors.accent} />
                            </View>
                            <View>
                                <Text style={styles.earnTitle}>Earn Free Credits</Text>
                                <Text style={styles.earnSub}>Watch {adsRequired} ads · Get 1 Credit</Text>
                            </View>
                        </View>
                        <View style={styles.freePill}>
                            <Text style={styles.freePillText}>FREE</Text>
                        </View>
                    </View>

                    {/* Progress track */}
                    <View style={styles.progressBlock}>
                        <View style={styles.progressMeta}>
                            <Text style={styles.progressMetaLabel}>Ads watched</Text>
                            <Text style={styles.progressMetaVal}>
                                {progress.isLoading ? '—' : `${adsWatched} of ${adsRequired}`}
                            </Text>
                        </View>

                        {/* Track */}
                        <View style={styles.trackBg}>
                            <View style={[styles.trackFill, { width: fillPct as any }]} />
                        </View>

                        {/* Step dots */}
                        <View style={styles.dotsRow}>
                            {Array.from({ length: adsRequired }).map((_, i) => (
                                <View key={i} style={styles.dotWrap}>
                                    <View style={[styles.dot, i < adsWatched && styles.dotActive]} />
                                    <Text style={styles.dotNum}>{i + 1}</Text>
                                </View>
                            ))}
                            {/* Credit icon at end */}
                            <View style={styles.dotWrap}>
                                <View style={styles.creditDot}>
                                    <Zap size={10} color="#fff" fill="#fff" />
                                </View>
                                <Text style={styles.dotNum}>1 CR</Text>
                            </View>
                        </View>
                    </View>

                    {/* Watch button */}
                    <TouchableOpacity
                        style={[styles.watchBtn, (!progress.isAdLoaded || progress.isWatching) && styles.watchBtnOff]}
                        onPress={watchAd}
                        disabled={!progress.isAdLoaded || progress.isWatching}
                        activeOpacity={0.88}
                    >
                        {progress.isWatching ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Play size={16} color="#fff" fill="#fff" />
                        )}
                        <Text style={styles.watchBtnText}>
                            {progress.isWatching ? 'Watching...' : !progress.isAdLoaded ? 'Loading Ad...' : 'Watch Ad'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* ── Why Credits ────────────────────────────────────── */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Why Credits?</Text>
                    {[
                        '1 Credit = 1 Full AI Match Automation',
                        'No monthly fee. Credits never expire.',
                        'Works on any lobby, any game, anytime.',
                    ].map((line, i) => (
                        <View key={i} style={styles.infoRow}>
                            <Check size={14} color={Theme.colors.accent} />
                            <Text style={styles.infoText}>{line}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.trust}>
                    <ShieldCheck size={14} color={Theme.colors.textSecondary} />
                    <Text style={styles.trustText}>Secure checkout via Razorpay</Text>
                </View>
                </>
                ) : (
                <>
                {/* ── Subscription Hero ────────────────────────────── */}
                <View style={styles.hero}>
                    <View style={[styles.heroPill, { backgroundColor: '#f59e0b18' }]}>
                        <Crown size={11} color="#f59e0b" />
                        <Text style={[styles.heroPillText, { color: '#f59e0b' }]}>UNLIMITED ACCESS</Text>
                    </View>
                    <Text style={styles.heroTitle}>Go Unlimited</Text>
                    <Text style={styles.heroSub}>Full AI automation for every match. No credits needed. Pick your plan.</Text>
                </View>

                {/* ── Active Subscription Banner ────────────────────── */}
                {activeSub && (
                    <View style={styles.activeSubBanner}>
                        <View style={styles.activeSubLeft}>
                            <View style={styles.activeSubDot} />
                            <View>
                                <Text style={styles.activeSubTitle}>Active: {activeSub.tier.charAt(0).toUpperCase() + activeSub.tier.slice(1)} Plan</Text>
                                <Text style={styles.activeSubExpiry}>Expires {activeSub.expiresAt.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
                            </View>
                        </View>
                        <InfinityIcon size={18} color="#10b981" />
                    </View>
                )}

                {/* ── Subscription Plans ───────────────────────────── */}
                <View style={styles.subsCol}>
                    {SUBSCRIPTION_PLANS.map((plan) => {
                        const isActive = activeSub?.tier === plan.id;
                        const isLoadingThis = processingPlanId === plan.id;
                        return (
                            <View key={plan.id} style={[styles.subCard, plan.popular && styles.subCardPopular, isActive && styles.subCardActive]}>
                                {plan.popular && !isActive && (
                                    <View style={[styles.popularRibbon, { backgroundColor: plan.accent }]}>
                                        <Text style={styles.popularRibbonText}>MOST POPULAR</Text>
                                    </View>
                                )}
                                {isActive && (
                                    <View style={[styles.popularRibbon, { backgroundColor: '#10b981' }]}>
                                        <Text style={styles.popularRibbonText}>✓ ACTIVE</Text>
                                    </View>
                                )}
                                <View style={styles.subCardTop}>
                                    <View style={[styles.subIconBox, { backgroundColor: plan.accent + '18' }]}>
                                        {plan.icon}
                                    </View>
                                    <View style={styles.subCardMid}>
                                        <Text style={styles.subPlanName}>{plan.name}</Text>
                                        <Text style={styles.subPlanTagline}>{plan.tagline}</Text>
                                    </View>
                                    <View style={styles.subPriceCol}>
                                        <Text style={[styles.subPrice, { color: plan.accent }]}>₹{plan.price}</Text>
                                        <Text style={styles.subDuration}>{plan.duration}</Text>
                                    </View>
                                </View>

                                <View style={styles.subPerks}>
                                    {plan.perks.map((perk, i) => (
                                        <View key={i} style={styles.subPerkRow}>
                                            <Check size={13} color={plan.accent} />
                                            <Text style={styles.subPerkText}>{perk}</Text>
                                        </View>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    disabled={isActive || isLoadingThis || processingPlanId !== null}
                                    activeOpacity={0.88}
                                    onPress={() => handleSubscriptionPurchase(plan)}
                                >
                                    <LinearGradient
                                        colors={isActive ? ['#10b981', '#059669'] : plan.gradColors}
                                        style={[styles.subBuyBtn, (isActive || processingPlanId !== null) && { opacity: 0.7 }]}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    >
                                        {isLoadingThis ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={styles.subBuyBtnText}>
                                                {isActive ? '✓ Currently Active' : `Subscribe · ₹${plan.price}`}
                                            </Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>

                {/* ── Subscription Info ─────────────────────────────── */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>How Unlimited Works</Text>
                    {[
                        'One payment = unlimited AI runs for the period',
                        'No credits deducted while subscription is active',
                        'Subscription does not auto-renew',
                        'Credits still work if subscription expires',
                    ].map((line, i) => (
                        <View key={i} style={styles.infoRow}>
                            <Check size={14} color={Theme.colors.accent} />
                            <Text style={styles.infoText}>{line}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.trust}>
                    <ShieldCheck size={14} color={Theme.colors.textSecondary} />
                    <Text style={styles.trustText}>Secure checkout via Razorpay</Text>
                </View>
                </>
                )}

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container:       { flex: 1, backgroundColor: Theme.colors.primary },
    topBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
    // Tab Switcher
    tabBar:          { flexDirection: 'row', marginHorizontal: 20, marginTop: 12, marginBottom: 8, backgroundColor: Theme.colors.secondary, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: Theme.colors.border },
    tabBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 11 },
    tabBtnActive:    { backgroundColor: Theme.colors.accent },
    tabBtnText:      { fontSize: 13, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textSecondary },
    tabBtnTextActive:{ color: '#fff' },
    // Active subscription banner
    activeSubBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#d1fae5', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#6ee7b7' },
    activeSubLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
    activeSubDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981' },
    activeSubTitle:  { fontSize: 14, fontFamily: Theme.fonts.outfit.bold, color: '#065f46' },
    activeSubExpiry: { fontSize: 11, color: '#047857', fontFamily: Theme.fonts.outfit.medium, marginTop: 1 },
    // Subscription plans
    subsCol:         { gap: 14, marginBottom: 4 },
    subCard:         { backgroundColor: Theme.colors.secondary, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: Theme.colors.border, overflow: 'hidden' },
    subCardPopular:  { borderColor: Theme.colors.accent, borderWidth: 1.5 },
    subCardActive:   { borderColor: '#10b981', borderWidth: 1.5 },
    subCardTop:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    subIconBox:      { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    subCardMid:      { flex: 1 },
    subPlanName:     { fontSize: 17, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    subPlanTagline:  { fontSize: 11, color: Theme.colors.textSecondary, fontFamily: Theme.fonts.outfit.medium, marginTop: 2 },
    subPriceCol:     { alignItems: 'flex-end' },
    subPrice:        { fontSize: 20, fontFamily: Theme.fonts.outfit.bold },
    subDuration:     { fontSize: 10, color: Theme.colors.textSecondary, fontFamily: Theme.fonts.outfit.medium, marginTop: 1 },
    subPerks:        { gap: 7, marginBottom: 14, paddingHorizontal: 4 },
    subPerkRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
    subPerkText:     { fontSize: 12, color: Theme.colors.textSecondary, fontFamily: Theme.fonts.outfit.medium, flex: 1 },
    subBuyBtn:       { height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    subBuyBtnText:   { color: '#fff', fontSize: 14, fontFamily: Theme.fonts.outfit.bold },
    backBtn:         { padding: 4 },
    topBarTitle:     { fontSize: 17, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    balancePill:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#ffedd5' },
    balanceVal:      { fontSize: 13, fontFamily: Theme.fonts.outfit.bold, color: '#c2410c' },
    scroll:          { padding: 20 },

    // Hero
    hero:            { alignItems: 'center', marginBottom: 28 },
    heroPill:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Theme.colors.accent + '12', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 14 },
    heroPillText:    { fontSize: 10, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.accent, letterSpacing: 1.2 },
    heroTitle:       { fontSize: 30, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary, textAlign: 'center' },
    heroSub:         { fontSize: 13, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 24 },

    // Card
    card:            { backgroundColor: Theme.colors.secondary, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 4 },
    cardRowBetween:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    cardTitle:       { fontSize: 16, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary, marginLeft: 8 },
    cardSub:         { fontSize: 12, color: Theme.colors.textSecondary, marginBottom: 16 },
    row:             { flexDirection: 'row', alignItems: 'center' },
    pill:            { backgroundColor: Theme.colors.accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    pillText:        { color: '#fff', fontSize: 9, fontFamily: Theme.fonts.outfit.bold },

    // Input
    inputRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.primary, borderRadius: 14, borderWidth: 1, borderColor: Theme.colors.border, paddingHorizontal: 16, height: 56, marginBottom: 16 },
    inputRowFocused: { borderColor: Theme.colors.accent, borderWidth: 1.5 },
    input:           { flex: 1, fontSize: 22, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    inputUnit:       { fontSize: 13, fontFamily: Theme.fonts.outfit.bold, color: '#f59e0b', marginLeft: 5 },

    // Price
    priceLabel:      { fontSize: 13, color: Theme.colors.textSecondary, fontFamily: Theme.fonts.outfit.medium },
    priceVal:        { fontSize: 22, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.accent },

    // Buy button
    buyBtn:          { marginTop: 18, height: 52, borderRadius: 14, overflow: 'hidden' },
    buyBtnGrad:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
    buyBtnText:      { color: '#fff', fontSize: 15, fontFamily: Theme.fonts.outfit.bold },

    // Divider
    dividerRow:      { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
    dividerLine:     { flex: 1, height: 1, backgroundColor: Theme.colors.border },
    dividerText:     { fontSize: 10, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textSecondary, letterSpacing: 1 },

    // Packs
    packsCol:        { gap: 10, marginBottom: 4 },
    packCard:        { backgroundColor: Theme.colors.secondary, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Theme.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
    packIcon:        { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    packMid:         { flex: 1 },
    packCredits:     { fontSize: 16, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    packName:        { fontSize: 11, color: Theme.colors.textSecondary, fontFamily: Theme.fonts.outfit.medium, marginTop: 1 },
    packPricePill:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    packPrice:       { fontSize: 15, fontFamily: Theme.fonts.outfit.bold },
    popularRibbon:   { position: 'absolute', top: 0, right: 0, backgroundColor: Theme.colors.accent, paddingHorizontal: 8, paddingVertical: 3, borderBottomLeftRadius: 10 },
    popularRibbonText: { color: '#fff', fontSize: 8, fontFamily: Theme.fonts.outfit.bold },

    // Earn Credits
    earnSection:     { backgroundColor: Theme.colors.secondary, borderRadius: 20, padding: 18, marginTop: 20, borderWidth: 1, borderColor: Theme.colors.border },
    earnTopRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    earnIconBox:     { width: 36, height: 36, borderRadius: 10, backgroundColor: Theme.colors.accent + '14', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    earnTitle:       { fontSize: 15, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    earnSub:         { fontSize: 11, color: Theme.colors.textSecondary, marginTop: 1 },
    freePill:        { backgroundColor: Theme.colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    freePillText:    { color: '#fff', fontSize: 9, fontFamily: Theme.fonts.outfit.bold, letterSpacing: 0.5 },

    // Progress
    progressBlock:   { marginBottom: 18, gap: 10 },
    progressMeta:    { flexDirection: 'row', justifyContent: 'space-between' },
    progressMetaLabel: { fontSize: 12, color: Theme.colors.textSecondary, fontFamily: Theme.fonts.outfit.medium },
    progressMetaVal: { fontSize: 12, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.accent },
    trackBg:         { height: 6, backgroundColor: Theme.colors.border, borderRadius: 3, overflow: 'hidden' },
    trackFill:       { height: '100%', backgroundColor: Theme.colors.accent, borderRadius: 3 },
    dotsRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 0, justifyContent: 'space-between', paddingHorizontal: 2, marginTop: 4 },
    dotWrap:         { alignItems: 'center', gap: 3 },
    dot:             { width: 8, height: 8, borderRadius: 4, backgroundColor: Theme.colors.border, borderWidth: 1, borderColor: Theme.colors.border },
    dotActive:       { backgroundColor: Theme.colors.accent, borderColor: Theme.colors.accent },
    dotNum:          { fontSize: 9, color: Theme.colors.textSecondary, fontFamily: Theme.fonts.outfit.medium },
    creditDot:       { width: 18, height: 18, borderRadius: 9, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },

    // Watch button
    watchBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Theme.colors.accent, height: 50, borderRadius: 14 },
    watchBtnOff:     { backgroundColor: Theme.colors.accent + '60' },
    watchBtnText:    { color: '#fff', fontSize: 15, fontFamily: Theme.fonts.outfit.bold },

    // Info
    infoCard:        { backgroundColor: Theme.colors.secondary, borderRadius: 20, padding: 18, marginTop: 20, borderWidth: 1, borderColor: Theme.colors.border },
    infoTitle:       { fontSize: 14, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary, marginBottom: 14 },
    infoRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    infoText:        { fontSize: 13, color: Theme.colors.textSecondary, fontFamily: Theme.fonts.outfit.regular },

    // Trust
    trust:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, marginBottom: 40 },
    trustText:       { fontSize: 12, color: Theme.colors.textSecondary },
});
