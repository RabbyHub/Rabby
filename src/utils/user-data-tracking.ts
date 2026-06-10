import browser from 'webextension-polyfill';

export const USER_DATA_TRACKING_OPT_OUT_KEY = 'userDataTrackingOptOut';

type TrackingPreference = {
  [USER_DATA_TRACKING_OPT_OUT_KEY]?: boolean;
};

export const shouldReportUserBehaviorData = async () => {
  try {
    const { preference } = await browser.storage.local.get('preference');
    if (!preference) {
      return false;
    }

    return (
      (preference as TrackingPreference)[USER_DATA_TRACKING_OPT_OUT_KEY] !==
      true
    );
  } catch (e) {
    return false;
  }
};
