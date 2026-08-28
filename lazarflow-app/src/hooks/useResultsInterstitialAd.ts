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
  // Running in Expo Go — ads are unavailable
}

/**
 * Manages a preloaded InterstitialAd for the results-save flow.
 *
 * Usage:
 *   const { showAdIfReady } = useResultsInterstitialAd();
 *   // Call showAdIfReady() right after a successful save.
 *   // It is always safe to call — silently skips if not loaded or disabled.
 */
export const useResultsInterstitialAd = () => {
  const adRef = useRef<ReturnType<typeof InterstitialAd.createForAdRequest> | null>(null);
  const isLoadedRef = useRef(false);

  const createAndLoad = () => {
    // If placement is disabled globally or running in Expo Go, skip
    if (!AD_PLACEMENTS.RESULTS_INTERSTITIAL.enabled || !InterstitialAd) return () => {};

    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.RESULTS_SAVE_INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: false,
    });

    const loadedSub = ad.addAdEventListener(AdEventType.LOADED, () => {
      isLoadedRef.current = true;
    });

    const closedSub = ad.addAdEventListener(AdEventType.CLOSED, () => {
      // Ad dismissed — preload the next one for future saves
      isLoadedRef.current = false;
      createAndLoad();
    });

    const errorSub = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.warn('📢 Interstitial ad failed to load:', error?.message);
      isLoadedRef.current = false;
      // Retry after the configured delay
      setTimeout(createAndLoad, AD_PLACEMENTS.RESULTS_INTERSTITIAL.retryDelayMs);
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
   * Call immediately after a successful results save.
   * Fire-and-forget — never throws, never blocks the save flow.
   */
  const showAdIfReady = () => {
    if (!AD_PLACEMENTS.RESULTS_INTERSTITIAL.enabled) return;
    if (adRef.current && isLoadedRef.current) {
      try {
        adRef.current.show();
      } catch (e) {
        console.warn('📢 Failed to show interstitial ad:', e);
      }
    }
  };

  return { showAdIfReady };
};
