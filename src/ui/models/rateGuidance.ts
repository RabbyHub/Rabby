import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { appIsDev } from '@/utils/env';

const TX_COUNT_LIMIT = appIsDev ? 1 : 3; // Minimum number of transactions before showing the rate guide
const STAR_COUNT = 5;
type RateModalState = {
  visible: boolean;
  userStar: number;
  userFeedback: string;
};

export function getDefaultRateModalState() {
  return {
    visible: false,
    userStar: STAR_COUNT,

    userFeedback: '',
  };
}

export const rateGuidance = createModel<RootModel>()({
  name: 'rateGuidance',

  state: <RateModalState>{
    ...getDefaultRateModalState(),
  },

  reducers: {
    setField(state, payload: Partial<RateModalState>) {
      return {
        ...state,
        ...payload,
      };
    },
  },

  selectors: (slice, state) => {
    return {};
  },

  effects: (dispatch) => ({}),
});
