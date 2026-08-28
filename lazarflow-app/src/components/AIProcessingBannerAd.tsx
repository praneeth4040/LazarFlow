import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AD_UNIT_IDS, AD_PLACEMENTS } from '../config/adConfig';

// react-native-google-mobile-ads requires a custom native build — not in Expo Go.
let BannerAd: any = null;
let BannerAdSize: any = null;
try {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
} catch (_) {
  // Expo Go — silently skip
}

/**
 * Banner ad shown in the AI processing waiting screen.
 * Render this while aiPhase === 'queued' or processingLobby === true.
 * Collapses to zero height if the ad fails to load or in Expo Go.
 */
const AIProcessingBannerAd: React.FC = () => {
  const [adLoaded, setAdLoaded] = useState(false);

  if (!AD_PLACEMENTS.AI_PROCESSING_BANNER.enabled) return null;
  if (!BannerAd) return null; // Expo Go

  return (
    <View style={[styles.container, !adLoaded && styles.hidden]}>
      <BannerAd
        unitId={AD_UNIT_IDS.AI_PROCESSING_BANNER}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={(error: any) => {
          console.warn('📢 AI processing banner failed to load:', error?.message);
          setAdLoaded(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 12,
  },
  hidden: {
    height: 0,
    overflow: 'hidden',
    marginTop: 0,
  },
});

export default AIProcessingBannerAd;
