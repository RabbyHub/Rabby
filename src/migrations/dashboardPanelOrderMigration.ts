import { PreferenceStore } from '@/background/service/preference';

const PREVIOUS_DEFAULT_PANEL_ORDER = [
  'swap',
  'send',
  'bridge',
  'receive',
  'transactions',
  'security',
  'perps',
  'points',
  'mobile',
  'dapps',
  'convertDust',
  'staking',
];

const DEFAULT_PANEL_ORDER = [
  'swap',
  'send',
  'bridge',
  'receive',
  'transactions',
  'security',
  'perps',
  'staking',
  'mobile',
  'dapps',
  'convertDust',
  'points',
];

export default {
  version: 13,
  async migrator(data: { preference: PreferenceStore | undefined }) {
    if (
      !data.preference ||
      data.preference.dashboardPanelOrder?.length !==
        PREVIOUS_DEFAULT_PANEL_ORDER.length ||
      !data.preference.dashboardPanelOrder.every(
        (key, index) => key === PREVIOUS_DEFAULT_PANEL_ORDER[index]
      )
    ) {
      return data;
    }

    return {
      preference: {
        ...data.preference,
        dashboardPanelOrder: DEFAULT_PANEL_ORDER,
      },
    };
  },
};
