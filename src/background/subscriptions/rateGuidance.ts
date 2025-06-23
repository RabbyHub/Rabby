import { EVENTS_IN_BG } from '@/constant';
import eventBus from '@/eventBus';
import {
  LAST_EXPOSURE_VERSIONED_KEY as VERSIONED_KEY,
  RATE_GUIDE_TX_COUNT_LIMIT as TX_COUNT_LIMIT,
} from '@/utils-isomorphic/rateGuidance';
import { PreferenceServiceCls } from '../service/preference';

export function subscribeTxCompleted({
  preferenceService,
}: {
  preferenceService: PreferenceServiceCls;
}) {
  eventBus.addEventListener(EVENTS_IN_BG.ON_TX_COMPLETED, (txDetail) => {
    console.debug('[subscribeTxCompleted] onTxCompleted', txDetail);
    const prev = preferenceService.getRateGuideLastExposure();

    let latestTxHashes = prev.latestTxHashes || [];

    if (txDetail?.hash && !latestTxHashes.includes(txDetail?.hash)) {
      latestTxHashes.push(txDetail?.hash);
    }
    latestTxHashes = latestTxHashes.slice(0, Math.max(10, TX_COUNT_LIMIT));

    const nextCount = latestTxHashes.length;

    const nextVal = {
      ...prev,
      txCount: nextCount,
      latestTxHashes,
      ...(nextCount >= TX_COUNT_LIMIT && {
        [VERSIONED_KEY]: { ...prev[VERSIONED_KEY], time: Date.now() },
      }),
    };
    preferenceService.setRateGuideLastExposure(nextVal);
  });
}
