import { createModel } from '@rematch/core';
import { RootModel } from '.';

const STAR_COUNT = 5;
type RateModalState = {
  visible: boolean;
  userStar: number;
  userFeedback: string;
  isSubmitting?: boolean;
};

export function getDefaultRateModalState() {
  return {
    visible: false,
    userStar: STAR_COUNT,

    userFeedback: '',
    isSubmitting: false,
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
