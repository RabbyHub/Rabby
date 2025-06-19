export const LAST_EXPOSURE_VERSIONED_KEY = 'lastExposure_20250619_1' as const;
export type RateGuideLastExposure = {
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
