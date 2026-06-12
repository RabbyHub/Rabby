import browser from 'webextension-polyfill';
import eventBus from '@/eventBus';
import { BROADCAST_TO_UI_EVENTS } from './broadcastToUI';

export const USER_DATA_TRACKING_OPT_OUT_KEY = 'userDataTrackingOptOut';
const BACKGROUND_BROADCAST_TO_UI_EVENT = 'broadcastToUI';

type TrackingPreference = {
  [USER_DATA_TRACKING_OPT_OUT_KEY]?: boolean;
};

let cachedShouldReportUserBehaviorData: boolean | undefined;

const getShouldReportFromPreference = (preference?: TrackingPreference) => {
  if (!preference) {
    return false;
  }

  return preference[USER_DATA_TRACKING_OPT_OUT_KEY] !== true;
};

export const resetUserDataTrackingCache = () => {
  cachedShouldReportUserBehaviorData = undefined;
};

export const updateUserDataTrackingCache = (
  preference?: TrackingPreference
) => {
  cachedShouldReportUserBehaviorData = getShouldReportFromPreference(
    preference
  );
};

const updateUserDataTrackingCacheFromStoreChanged = (payload?: {
  bgStoreName?: string;
  changedKey?: string;
  changedKeys?: string[];
  partials?: Record<string, any>;
}) => {
  if (payload?.bgStoreName !== 'preference') {
    return;
  }

  const changedKeys = payload.changedKeys || [payload.changedKey];
  if (
    !changedKeys.includes(USER_DATA_TRACKING_OPT_OUT_KEY) &&
    !(USER_DATA_TRACKING_OPT_OUT_KEY in (payload.partials || {}))
  ) {
    return;
  }

  cachedShouldReportUserBehaviorData =
    payload.partials?.[USER_DATA_TRACKING_OPT_OUT_KEY] !== true;
};

eventBus.addEventListener(
  BROADCAST_TO_UI_EVENTS.storeChanged,
  updateUserDataTrackingCacheFromStoreChanged
);

eventBus.addEventListener(BACKGROUND_BROADCAST_TO_UI_EVENT, (payload) => {
  if (payload?.method !== BROADCAST_TO_UI_EVENTS.storeChanged) {
    return;
  }

  updateUserDataTrackingCacheFromStoreChanged(payload.params);
});

export const shouldReportUserBehaviorData = async () => {
  if (cachedShouldReportUserBehaviorData !== undefined) {
    return cachedShouldReportUserBehaviorData;
  }

  try {
    const { preference } = await browser.storage.local.get('preference');
    updateUserDataTrackingCache(preference as TrackingPreference | undefined);
    return cachedShouldReportUserBehaviorData ?? false;
  } catch (e) {
    cachedShouldReportUserBehaviorData = false;
    return false;
  }
};
