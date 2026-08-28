import { useEffect, useRef } from 'react';
import { AD_UNIT_IDS, AD_PLACEMENTS } from '../config/adConfig';

// react-native-google-mobile-ads requires a custom native build — not available in Expo Go.
let InterstitialAd: any = null;
let AdEventType: any = null;
try {
  const ads = require('react-native-google-mobile-ads');
  InterstitialAd = ads.InterstitialAd;
  AdEventType = ads.AdEventType;
} catch (_) {
  // Running in Expo Go — ads unavailable
}

/**
 * Manages a preloaded InterstitialAd for the theme upload flow.
 *
 * Usage:
 *   const { showAdIfReady } = useThemeUploadInterstitialAd();
 *   // Call showAdIfReady() right after a successful theme upload.
 *   // Always safe to call — silently skips if not loaded or in Expo Go.
 */
export const useThemeUploadInterstitialAd = () => {
  const adRef = useRef<any>(null);
  const isLoadedRef = useRef(false);

  const createAndLoad = () => {
    if (!AD_PLACEMENTS.THEME_UPLOAD_INTERSTITIAL.enabled || !InterstitialAd) return () => {};

    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.THEME_UPLOAD_INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: false,
    });

    const loadedSub = ad.addAdEventListener(AdEventType.LOADED, () => {
      isLoadedRef.current = true;
    });

    const closedSub = ad.addAdEventListener(AdEventType.CLOSED, () => {
      isLoadedRef.current = false;
      createAndLoad(); // preload for next upload
    });

    const errorSub = ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.warn('📢 Theme upload interstitial failed to load:', error?.message);
      isLoadedRef.current = false;
      setTimeout(createAndLoad, AD_PLACEMENTS.THEME_UPLOAD_INTERSTITIAL.retryDelayMs);
    });

    ad.load();
    adRef.current = ad;

    return () => {
      loadedSub();
      closedSub();
      errorSub();
    };
  };

  useEffect(() => {
    const cleanup = createAndLoad();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Call immediately after a successful theme upload.
   * Fire-and-forget — never throws, never blocks the upload flow.
   */
  const showAdIfReady = () => {
    if (!AD_PLACEMENTS.THEME_UPLOAD_INTERSTITIAL.enabled) return;
    if (adRef.current && isLoadedRef.current) {
      try {
        adRef.current.show();
      } catch (e) {
        console.warn('📢 Failed to show theme upload interstitial:', e);
      }
    }
  };

  return { showAdIfReady };
};
