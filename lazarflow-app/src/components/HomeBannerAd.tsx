import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AD_UNIT_IDS, AD_PLACEMENTS } from '../config/adConfig';

// react-native-google-mobile-ads requires a custom native build — not available in Expo Go.
// We lazy-import it so the app doesn't crash in Expo Go.
let BannerAd: any = null;
let BannerAdSize: any = null;
try {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
} catch (_) {
  // Running in Expo Go — ads are unavailable
}

const HomeBannerAd: React.FC = () => {
  const [adLoaded, setAdLoaded] = useState(false);

  if (!AD_PLACEMENTS.HOME_BANNER.enabled) return null;
  if (!BannerAd) return null; // Expo Go — silently skip

  return (
    <View style={[styles.container, !adLoaded && styles.hidden]}>
      <BannerAd
        unitId={AD_UNIT_IDS.HOME_TOURNAMENT_LIST_BANNER}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={(error: any) => {
          console.warn('📢 Banner ad failed to load:', error?.message);
          setAdLoaded(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  hidden: {
    height: 0,
    overflow: 'hidden',
    marginVertical: 0,
  },
});

export default HomeBannerAd;
