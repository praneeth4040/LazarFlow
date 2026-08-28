import { useEffect, useRef, useState, useCallback } from 'react';
import { AD_UNIT_IDS, AD_PLACEMENTS } from '../config/adConfig';
import apiClient from '../lib/apiClient';

// react-native-google-mobile-ads requires a native build — not in Expo Go.
let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let AdEventType: any = null;
try {
  const ads = require('react-native-google-mobile-ads');
  RewardedAd = ads.RewardedAd;
  RewardedAdEventType = ads.RewardedAdEventType;
  AdEventType = ads.AdEventType;
} catch (_) {
  // Expo Go — ads unavailable
}

export interface AdProgress {
  adsWatched: number;
  adsRequired: number;
  isLoading: boolean;   // fetching progress from server
  isAdLoaded: boolean;  // rewarded ad preloaded and ready
  isWatching: boolean;  // ad currently playing
}

interface UseEarnCreditRewardedAdOptions {
  onCreditEarned?: (newBalance: number) => void;
  onError?: (message: string) => void;
}

/**
 * Manages the "watch ads to earn credits" flow.
 *
 * Usage:
 *   const { progress, watchAd } = useEarnCreditRewardedAd({ onCreditEarned, onError });
 */
export const useEarnCreditRewardedAd = ({
  onCreditEarned,
  onError,
}: UseEarnCreditRewardedAdOptions = {}) => {
  const [progress, setProgress] = useState<AdProgress>({
    adsWatched: 0,
    adsRequired: AD_PLACEMENTS.EARN_CREDIT_REWARDED.adsPerCredit,
    isLoading: true,
    isAdLoaded: false,
    isWatching: false,
  });

  const adRef = useRef<any>(null);
  const isLoadedRef = useRef(false);
  // Track whether the user earned the reward in the current ad session
  const rewardEarnedRef = useRef(false);

  // ── Fetch current progress from server ──────────────────────────────────
  const fetchProgress = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/rewards/ad-progress');
      setProgress(prev => ({
        ...prev,
        adsWatched: data.ads_watched ?? 0,
        adsRequired: data.ads_required ?? AD_PLACEMENTS.EARN_CREDIT_REWARDED.adsPerCredit,
        isLoading: false,
      }));
    } catch (e) {
      console.warn('📢 Failed to fetch ad progress:', e);
      setProgress(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // ── Preload rewarded ad ──────────────────────────────────────────────────
  const createAndLoad = useCallback(() => {
    if (!AD_PLACEMENTS.EARN_CREDIT_REWARDED.enabled || !RewardedAd) return () => {};

    const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.EARN_CREDIT_REWARDED, {
      requestNonPersonalizedAdsOnly: false,
    });

    const loadedSub = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      isLoadedRef.current = true;
      setProgress(prev => ({ ...prev, isAdLoaded: true }));
    });

    const earnedSub = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      // User watched the full ad — flag it so we credit on close
      rewardEarnedRef.current = true;
    });

    const closedSub = ad.addAdEventListener(AdEventType.CLOSED, async () => {
      isLoadedRef.current = false;
      setProgress(prev => ({ ...prev, isWatching: false, isAdLoaded: false }));

      if (rewardEarnedRef.current) {
        rewardEarnedRef.current = false;
        // Notify backend and update progress
        try {
          const { data } = await apiClient.post('/api/rewards/watch-ad');
          setProgress(prev => ({
            ...prev,
            adsWatched: data.ads_watched ?? 0,
            adsRequired: data.ads_required ?? AD_PLACEMENTS.EARN_CREDIT_REWARDED.adsPerCredit,
          }));
          if (data.credit_granted) {
            onCreditEarned?.(data.new_flux_balance);
          }
        } catch (e: any) {
          const status = e?.response?.status;
          if (status === 429) {
            onError?.('Too fast! Please wait a moment before watching another ad.');
          } else {
            onError?.('Could not record your reward. Please try again.');
          }
        }
      }

      // Preload the next ad
      createAndLoad();
    });

    const errorSub = ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.warn('📢 Rewarded ad failed to load:', error?.message);
      isLoadedRef.current = false;
      setProgress(prev => ({ ...prev, isAdLoaded: false }));
      setTimeout(createAndLoad, AD_PLACEMENTS.EARN_CREDIT_REWARDED.retryDelayMs);
    });

    ad.load();
    adRef.current = ad;

    return () => {
      loadedSub();
      earnedSub();
      closedSub();
      errorSub();
    };
  }, [onCreditEarned, onError]);

  useEffect(() => {
    fetchProgress();
    const cleanup = createAndLoad();
    return cleanup;
  }, []);

  // ── Public: trigger the ad ───────────────────────────────────────────────
  const watchAd = useCallback(() => {
    if (!AD_PLACEMENTS.EARN_CREDIT_REWARDED.enabled) {
      onError?.('Earn credits feature is currently disabled.');
      return;
    }
    if (!RewardedAd) {
      onError?.('Ads are not available in this build.');
      return;
    }
    if (!isLoadedRef.current || !adRef.current) {
      onError?.('Ad is not ready yet. Please wait a moment and try again.');
      return;
    }
    try {
      rewardEarnedRef.current = false;
      setProgress(prev => ({ ...prev, isWatching: true }));
      adRef.current.show();
    } catch (e) {
      setProgress(prev => ({ ...prev, isWatching: false }));
      onError?.('Failed to show ad. Please try again.');
    }
  }, [onError]);

  return { progress, watchAd, fetchProgress };
};
