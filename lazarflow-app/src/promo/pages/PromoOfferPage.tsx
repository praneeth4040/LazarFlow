import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Alert,
} from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Circle, Ellipse, Rect, Path } from 'react-native-svg';
import { ArrowRight, X } from 'lucide-react-native';
import { Theme } from '../../styles/theme';

// Promo offer page — design source: promo-page-design.html (the admin's own
// HTML reference, ported 1:1). The claim action is a placeholder until the
// backend claim endpoint lands. All SVG colors are inline literals — no
// shared lookups, so a stale transform can never black-fill the art.

const ACCENT = '#1F5BFF';
const INK = '#0B0B0F';
const MUTED = '#4A5163';
const TINT = '#EAF1FF';

const TrophyArt = () => (
  <Svg viewBox="0 0 390 260" width="100%" height={230}>
    <Defs>
      <SvgGradient id="cup" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#6A9AFF" />
        <Stop offset="1" stopColor="#1F5BFF" />
      </SvgGradient>
      <SvgGradient id="stem" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#1448D6" />
        <Stop offset="1" stopColor="#3A72FF" />
      </SvgGradient>
    </Defs>
    <Ellipse cx={195} cy={214} rx={76} ry={9} fill="#B3CDFF" />
    <Path d="M155 92H138C130 92 128 100 130 108C133 122 144 128 157 128" stroke={ACCENT} strokeWidth={9} strokeLinecap="round" />
    <Path d="M235 92H252C260 92 262 100 260 108C257 122 246 128 233 128" stroke={ACCENT} strokeWidth={9} strokeLinecap="round" />
    <Rect x={186} y={156} width={18} height={26} fill="url(#stem)" />
    <Path d="M153 78H237V110C237 140 219 158 195 162C171 158 153 140 153 110Z" fill="url(#cup)" />
    <Path d="M167 90V110C167 124 175 134 185 141" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={6} strokeLinecap="round" />
    <Path d="M195 96L199.7 107.5L212.1 108.4L202.6 116.5L205.6 128.6L195 122L184.4 128.6L187.4 116.5L177.9 108.4L190.3 107.5Z" fill="#FFFFFF" />
    <Rect x={158} y={180} width={74} height={16} rx={8} fill={INK} />
    <Rect x={170} y={194} width={50} height={12} rx={6} fill={INK} />
    <Circle cx={66} cy={76} r={7} fill={ACCENT} />
    <Circle cx={62} cy={186} r={9} fill="#9DBCFF" />
    <Circle cx={334} cy={176} r={6} fill={INK} />
    <Rect x={318} y={58} width={15} height={15} rx={4} fill="#7FA6FF" transform="rotate(20 325 65)" />
    <Rect x={98} y={126} width={11} height={11} rx={3} fill={INK} transform="rotate(-18 103 131)" />
    <Path d="M112 44Q112 54 122 54Q112 54 112 64Q112 54 102 54Q112 54 112 44Z" fill={ACCENT} />
    <Path d="M292 112Q292 124 304 124Q292 124 292 136Q292 124 280 124Q292 124 292 112Z" fill={ACCENT} />
    <Path d="M270 40Q270 46 276 46Q270 46 270 52Q270 46 264 46Q270 46 270 40Z" fill={INK} />
  </Svg>
);

const BENEFITS = [
  {
    title: 'AI-powered results',
    text: 'Extract full standings from one screenshot.',
    icon: (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill={ACCENT}>
        <Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      </Svg>
    ),
  },
  {
    title: 'Zero Flux deductions',
    text: 'Run AI extractions without spending credits.',
    icon: (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth={2.6} strokeLinecap="round">
        <Path d="M5 20V10M12 20V4M19 20v-7" />
      </Svg>
    ),
  },
  {
    title: 'Lifetime for top users',
    text: 'Our most active players get lifetime access.',
    icon: (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill={ACCENT}>
        <Path d="M5 3h14v3a7 7 0 0 1-4 6.3V15h2a1 1 0 0 1 1 1v2H6v-2a1 1 0 0 1 1-1h2v-2.7A7 7 0 0 1 5 6V3zm3 3v.5a4 4 0 0 0 8 0V6z" />
        <Path d="M12 6l.9 2.1L15 8.9l-2.1.9L12 12l-.9-2.1L9 8.9l2.1-.9z" fill="#FFFFFF" />
      </Svg>
    ),
  },
];

const PromoOfferPage = ({ navigation }: any) => {
  const handleClaim = () => {
    // Placeholder until the claim endpoint lands — kept visible so the flow
    // is testable end to end once the backend is wired.
    Alert.alert('Claiming opens soon', 'The claim backend is being wired up — hang tight.');
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#DCE9FD" />
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.topbar}>
            <Text style={styles.logo}>
              Lazar<Text style={{ color: ACCENT }}>Flow</Text>
            </Text>
            <TouchableOpacity style={styles.close} onPress={() => navigation.goBack()} accessibilityLabel="Close">
              <X size={15} color={INK} />
            </TouchableOpacity>
          </View>
          <View style={styles.artWrap}>
            <View style={styles.circleOuter} />
            <View style={styles.circleInner} />
            <TrophyArt />
          </View>
        </View>

        {/* ── Sheet ── */}
        <View style={styles.sheet}>
          <View style={styles.pillWrap}>
            <Text style={styles.pill}>FREE FOR ALL USERS</Text>
          </View>
          <Text style={styles.h1}>
            A week of <Text style={{ color: ACCENT }}>Premium.</Text>
            {'\n'}On the house.
          </Text>
          <Text style={styles.sub}>Unlock everything in LazarFlow for 7 days. No upgrade needed.</Text>

          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b.title} style={styles.benefit}>
                <View style={styles.icon}>{b.icon}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitText}>{b.text}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cta} onPress={handleClaim} activeOpacity={0.85}>
              <Text style={styles.ctaText}>Claim my free week</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.later} onPress={() => navigation.goBack()}>
              <Text style={styles.laterText}>Maybe later</Text>
            </TouchableOpacity>
            <Text style={styles.fine}>Valid till the admin's mood holds</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  hero: {
    backgroundColor: '#DCE9FD',
    paddingTop: 54,               // safe area: status bar + notch
    alignItems: 'center',
  },
  artWrap: {
    width: '100%', height: 230,
    alignItems: 'center', justifyContent: 'center',
  },
  circleOuter: {
    position: 'absolute', width: 246, height: 246, borderRadius: 123,
    backgroundColor: '#DDE9FF',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)',
  },
  circleInner: {
    position: 'absolute', width: 176, height: 176, borderRadius: 88,
    backgroundColor: '#CFE0FF',
  },
  topbar: {
    position: 'absolute', left: 0, right: 0, top: 54,
    paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    zIndex: 2,
  },
  logo: { fontWeight: '800', fontSize: 20, letterSpacing: -0.3, color: INK },
  close: {
    width: 44, height: 44, borderRadius: 50, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3C4043', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    marginTop: -26, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24, gap: 10,
  },
  pillWrap: { flexDirection: 'row' },
  pill: {
    backgroundColor: INK, color: '#FFFFFF',
    fontSize: 11, fontWeight: '800', letterSpacing: 1.4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, overflow: 'hidden',
  },
  h1: { fontSize: 32, fontWeight: '800', lineHeight: 36, letterSpacing: -0.8, color: INK },
  sub: { fontSize: 15, lineHeight: 22, color: '#3B4252' },
  benefits: { flexDirection: 'column', gap: 14, marginTop: 12 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: {
    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
    backgroundColor: TINT, alignItems: 'center', justifyContent: 'center',
  },
  benefitTitle: { fontWeight: '600', fontSize: 15, color: INK },
  benefitText: { fontSize: 13, color: MUTED },
  actions: { marginTop: 8, flexDirection: 'column', gap: 2 },
  cta: {
    minHeight: 58, borderRadius: 18, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10,
    shadowColor: ACCENT, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  ctaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 17 },
  later: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  laterText: { color: INK, fontWeight: '600', fontSize: 15 },
  fine: { textAlign: 'center', fontSize: 12, color: MUTED },
});

export default PromoOfferPage;
