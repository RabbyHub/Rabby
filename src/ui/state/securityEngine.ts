import {
  Level,
  RuleConfig,
  UserData,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import { create } from 'zustand';
import React, { createContext, useContext, useMemo } from 'react';
import { isEqual } from 'lodash';

import { wallet } from '@/ui/wallet';
import {
  getProcessedRulesForScope,
  getSecurityRuleKey,
} from './securityEngineScope';

export { getSecurityRuleKey } from './securityEngineScope';

export type SecurityEngineRule = {
  ruleConfig: RuleConfig;
  value?: number | string | boolean;
  level?: Level;
  ignored: boolean;
  scope?: string;
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
  unProcessRule: (id: string, scope?: string) => void;
  processRule: (id: string, scope?: string) => void;
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

const securityEngineStore = create<SecurityEngineStore>()((set) => ({
  ...getDefaultSecurityEngineState(),

  async init() {
    const [userData, rules] = await Promise.all([
      wallet.getSecurityEngineUserData(),
      wallet.getSecurityEngineRules(),
    ]);
    set((state) => {
      const sameUserData = isEqual(state.userData, userData);
      const sameRules = isEqual(state.rules, rules);
      // Rows also refresh settings when they mount. Preserve unchanged input
      // references so those refreshes do not start another approval evaluation.
      if (sameUserData && sameRules) return state;
      return {
        userData: sameUserData ? state.userData : userData,
        rules: sameRules ? state.rules : rules,
      };
    });
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

  unProcessRule(id, scope) {
    const key = getSecurityRuleKey(id, scope);
    set((state) => ({
      currentTx: {
        ...state.currentTx,
        processedRules: state.currentTx.processedRules.filter(
          (ruleId) => ruleId !== key
        ),
      },
    }));
  },

  processRule(id, scope) {
    const key = getSecurityRuleKey(id, scope);
    set((state) => ({
      currentTx: {
        ...state.currentTx,
        processedRules: Array.from(
          new Set([...state.currentTx.processedRules, key])
        ),
      },
    }));
  },
}));

const SecurityEngineScopeContext = createContext<string | undefined>(undefined);

export const SecurityEngineScopeProvider = ({
  scope,
  children,
}: {
  scope?: string;
  children?: React.ReactNode;
}) =>
  React.createElement(
    SecurityEngineScopeContext.Provider,
    { value: scope },
    children
  );

const identity = (state: SecurityEngineStore) => state;

function useScopedSecurityEngineStore(): SecurityEngineStore;
function useScopedSecurityEngineStore<T>(
  selector: (state: SecurityEngineStore) => T
): T;
function useScopedSecurityEngineStore<T = SecurityEngineStore>(
  selector: (state: SecurityEngineStore) => T = identity as (
    state: SecurityEngineStore
  ) => T
): T {
  const scope = useContext(SecurityEngineScopeContext);
  const select = useMemo(() => {
    let previousState: SecurityEngineStore | undefined;
    let scopedState: SecurityEngineStore;
    return (state: SecurityEngineStore) => {
      if (scope === undefined) return selector(state);
      // Zustand requires a stable snapshot between changes, including when no
      // selector is supplied. Keep the projected state cached for this scope.
      if (state !== previousState) {
        previousState = state;
        scopedState = {
          ...state,
          currentTx: {
            ...state.currentTx,
            processedRules: getProcessedRulesForScope(
              state.currentTx.processedRules,
              scope
            ),
          },
          openRuleDrawer: (rule) => state.openRuleDrawer({ ...rule, scope }),
        };
      }
      return selector(scopedState);
    };
  }, [scope, selector]);
  return securityEngineStore(select);
}

// Preserve the static store API used by approval lifecycle code and tests.
export const useSecurityEngineStore = Object.assign(
  useScopedSecurityEngineStore,
  securityEngineStore
);
