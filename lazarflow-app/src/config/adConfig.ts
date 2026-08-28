/**
 * AdMob Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * All ad unit IDs and placement settings live here.
 * To add a new ad placement: add an entry to AD_UNIT_IDS and AD_PLACEMENTS,
 * then consume it in the relevant component/hook.
 *
 * AdMob App ID (Android): ca-app-pub-6740951357526226~3080877290
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Ad Unit IDs ─────────────────────────────────────────────────────────────
export const AD_UNIT_IDS = {
  /** Banner inline in the Home tab tournament list (after 1st card). */
  HOME_TOURNAMENT_LIST_BANNER: 'ca-app-pub-6740951357526226/3317128126',

  /** Interstitial after tournament results are saved. */
  RESULTS_SAVE_INTERSTITIAL: 'ca-app-pub-6740951357526226/7299393716',

  /** Interstitial after a theme is uploaded. */
  THEME_UPLOAD_INTERSTITIAL: 'ca-app-pub-6740951357526226/7078379352',

  /** Banner shown during AI job processing (queued / uploading state). */
  AI_PROCESSING_BANNER: 'ca-app-pub-6740951357526226/3134003132',

  /** Rewarded ad — user watches 5 to earn 1 credit. */
  EARN_CREDIT_REWARDED: 'ca-app-pub-6740951357526226/2639179111',
} as const;

// ─── Placement Settings ───────────────────────────────────────────────────────
export const AD_PLACEMENTS = {
  HOME_BANNER: {
    insertAfterIndex: 0,
    enabled: true,
  },

  RESULTS_INTERSTITIAL: {
    retryDelayMs: 30_000,
    enabled: true,
  },

  THEME_UPLOAD_INTERSTITIAL: {
    retryDelayMs: 30_000,
    enabled: true,
  },

  AI_PROCESSING_BANNER: {
    enabled: true,
  },

  EARN_CREDIT_REWARDED: {
    /** How many ads a user must watch to earn 1 credit. */
    adsPerCredit: 5,
    retryDelayMs: 30_000,
    enabled: true,
  },
} as const;
