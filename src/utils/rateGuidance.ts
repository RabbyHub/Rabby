import { appIsDev } from '@/utils/env';

export const RATE_GUIDE_TX_COUNT_LIMIT = appIsDev ? 1 : 3; // Minimum number of transactions before showing the rate guide

export const LAST_EXPOSURE_VERSIONED_KEY = 'lastExposure_20250619_1' as const;
export type RateGuideLastExposure = {
  __UI_FORCE_DISABLE_ON_NEXT_LAUNCH_WINDOW__?: boolean; // Force disable the rate guide on next launch
  txCount: number;
  latestTxHashes?: string[]; // Array of latest transaction hashes
  [LAST_EXPOSURE_VERSIONED_KEY]?:
    | {
        time: number; // Timestamp of the last exposure
        userViewedRate?: boolean; // Whether the user has rated the guide
      }
    | undefined;
};
const enum RATE_GUIDE_STATE {
  INIT = -1,
}
export const getDefaultRateGuideLastExposure = (
  lastExposureTimestamp: Partial<
    RateGuideLastExposure[typeof LAST_EXPOSURE_VERSIONED_KEY]
  > = {
    time: RATE_GUIDE_STATE.INIT,
    userViewedRate: false,
  }
): RateGuideLastExposure => ({
  __UI_FORCE_DISABLE_ON_NEXT_LAUNCH_WINDOW__: false,
  txCount: 0,
  latestTxHashes: [],
  [LAST_EXPOSURE_VERSIONED_KEY]: {
    time: RATE_GUIDE_STATE.INIT,
    userViewedRate: false,
    ...lastExposureTimestamp,
  },
});
export function userCouldRated(
  rateGuidance?: ReturnType<typeof getDefaultRateGuideLastExposure>
) {
  const lastExposureTimestamp = rateGuidance?.[LAST_EXPOSURE_VERSIONED_KEY];

  return (
    !lastExposureTimestamp?.userViewedRate &&
    lastExposureTimestamp?.time &&
    lastExposureTimestamp?.time !== RATE_GUIDE_STATE.INIT &&
    lastExposureTimestamp?.time < Date.now()
  );
}
