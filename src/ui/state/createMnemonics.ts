import { wallet } from '@/ui/wallet';
import { create } from 'zustand';

export type CreateMnemonicsStep = 'risk-check' | 'display';

export type CreateMnemonicsState = {
  mnemonics: string;
  step: CreateMnemonicsStep;
};

type CreateMnemonicsActions = {
  prepareMnemonicsAsync: () => Promise<void>;
  cleanCreateAsync: () => Promise<void>;
  stepTo: (step: CreateMnemonicsStep) => void;
  reset: () => void;
};

export type CreateMnemonicsStore = CreateMnemonicsState &
  CreateMnemonicsActions;

export function getDefaultCreateMnemonicsState(): CreateMnemonicsState {
  return {
    mnemonics: '',
    step: 'risk-check',
  };
}

export const getRandomMnemonics = (mnemonics: string) =>
  mnemonics.split(' ').sort(() => Math.random() - 0.5);

export const useCreateMnemonicsStore = create<CreateMnemonicsStore>()(
  (set) => ({
    ...getDefaultCreateMnemonicsState(),

    async prepareMnemonicsAsync() {
      const mnemonics =
        (await wallet.getPreMnemonics()) ||
        (await wallet.generatePreMnemonic());

      set({ mnemonics });
    },

    async cleanCreateAsync() {
      await wallet.removePreMnemonics();
    },

    stepTo(step) {
      set({ step });
    },

    reset() {
      set({ step: 'risk-check' });
    },
  })
);
