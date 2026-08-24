import { create } from 'zustand';

const STAR_COUNT = 5;

export type RateModalState = {
  visible: boolean;
  userStar: number;
  userFeedback: string;
  isSubmitting?: boolean;
};

type RateGuidanceActions = {
  setField: (partials: Partial<RateModalState>) => void;
};

export type RateGuidanceStore = RateModalState & RateGuidanceActions;

export function getDefaultRateModalState(): RateModalState {
  return {
    visible: false,
    userStar: STAR_COUNT,
    userFeedback: '',
    isSubmitting: false,
  };
}

export const useRateGuidanceStore = create<RateGuidanceStore>()((set) => ({
  ...getDefaultRateModalState(),

  setField(partials) {
    set(partials);
  },
}));
