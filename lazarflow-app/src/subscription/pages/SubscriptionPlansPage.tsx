import React, { useContext, useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, Dimensions, TextInput, NativeModules, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ArrowLeft, Zap, ShoppingBag, TrendingUp, Cpu, ShieldCheck, Play, Tv } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { UserContext } from '../../context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import RazorpayCheckout from 'react-native-razorpay';
import apiClient from '../../lib/apiClient';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { useEarnCreditRewardedAd } from '../../hooks/useEarnCreditRewardedAd';
import { AD_PLACEMENTS } from '../../config/adConfig';

interface SubscriptionPlansPageProps {
    navigation: any;
    route?: { params?: { isTab?: boolean } };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRICE_PER_CREDIT = 1;

export const SubscriptionPlansPage: React.FC<SubscriptionPlansPageProps> = ({ navigation, route }) => {
    const isTab = route?.params?.isTab || false;
    const { user, refreshUser } = useContext(UserContext);
    const [customAmount, setCustomAmount] = useState('250');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCustomFocused, setIsCustomFocused] = useState(false);

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
            const status = err.code === 2 ? 'cancelled' : 'failed';
            const msg = err.code === 2 ? 'Payment cancelled.' : (err.description || err.message || 'Transaction failed');
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
                    <Text style={styles.topBarTitle}>Credit Store</Text>
                    <View style={styles.balancePill}>
                        <Zap size={12} color="#f59e0b" fill="#f59e0b" />
                        <Text style={styles.balanceVal}>{user?.flux_balance ?? 0}</Text>
                    </View>
                </View>
            )}

            <ScrollView contentContainerStyle={[styles.scroll, isTab && { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>

                {/* ── Hero ──────────────────────────────────────────── */}
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

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container:       { flex: 1, backgroundColor: Theme.colors.primary },
    topBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
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
