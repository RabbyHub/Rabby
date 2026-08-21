import {
  Level,
  RuleConfig,
  UserData,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import { create } from 'zustand';

import { wallet } from '@/ui/wallet';

export type SecurityEngineRule = {
  ruleConfig: RuleConfig;
  value?: number | string | boolean;
  level?: Level;
  ignored: boolean;
};

export type SecurityEngineState = {
  userData: UserData;
  rules: RuleConfig[];
  currentTx: {
    processedRules: string[];
    ruleDrawer: {
      selectRule: SecurityEngineRule | null;
      visible: boolean;
    };
  };
};

type SecurityEngineActions = {
  init: () => Promise<void>;
  resetCurrentTx: () => void;
  openRuleDrawer: (rule: SecurityEngineRule) => void;
  closeRuleDrawer: () => void;
  processAllRules: (ids: string[]) => void;
  unProcessRule: (id: string) => void;
  processRule: (id: string) => void;
};

export type SecurityEngineStore = SecurityEngineState & SecurityEngineActions;

export function getDefaultSecurityEngineState(): SecurityEngineState {
  return {
    userData: {
      originWhitelist: [],
      originBlacklist: [],
      contractWhitelist: [],
      contractBlacklist: [],
      addressWhitelist: [],
      addressBlacklist: [],
    },
    rules: [],
    currentTx: {
      processedRules: [],
      ruleDrawer: {
        selectRule: null,
        visible: false,
      },
    },
  };
}

export const useSecurityEngineStore = create<SecurityEngineStore>()((set) => ({
  ...getDefaultSecurityEngineState(),

  async init() {
    const [userData, rules] = await Promise.all([
      wallet.getSecurityEngineUserData(),
      wallet.getSecurityEngineRules(),
    ]);
    set({ userData, rules });
  },

  resetCurrentTx() {
    set({ currentTx: getDefaultSecurityEngineState().currentTx });
  },

  openRuleDrawer(rule) {
    set((state) => ({
      currentTx: {
        ...state.currentTx,
        ruleDrawer: {
          selectRule: rule,
          visible: true,
        },
      },
    }));
  },

  closeRuleDrawer() {
    set((state) => ({
      currentTx: {
        ...state.currentTx,
        ruleDrawer: {
          selectRule: null,
          visible: false,
        },
      },
    }));
  },

  processAllRules(processedRules) {
    set((state) => ({
      currentTx: {
        ...state.currentTx,
        processedRules,
      },
    }));
  },

  unProcessRule(id) {
    set((state) => ({
      currentTx: {
        ...state.currentTx,
        processedRules: state.currentTx.processedRules.filter(
          (ruleId) => ruleId !== id
        ),
      },
    }));
  },

  processRule(id) {
    set((state) => ({
      currentTx: {
        ...state.currentTx,
        processedRules: [...state.currentTx.processedRules, id],
      },
    }));
  },
}));
