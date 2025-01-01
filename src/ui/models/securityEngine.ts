import { createModel } from '@rematch/core';
import {
  RuleConfig,
  Level,
  UserData,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import { RootModel } from '.';

interface State {
  userData: UserData;
  rules: RuleConfig[];
  currentTx: {
    processedRules: string[];
    ruleDrawer: {
      selectRule: {
        ruleConfig: RuleConfig;
        value?: number | string | boolean;
        level?: Level;
        ignored: boolean;
      } | null;
      visible: boolean;
    };
  };
}

export const securityEngine = createModel<RootModel>()({
  name: 'securityEngine',
  state: {
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
  } as State,
  reducers: {
    setField(state, payload: Partial<typeof state>) {
      return Object.keys(payload).reduce(
        (accu, key) => {
          accu[key] = payload[key];
          return accu;
        },
        { ...state }
      );
    },
    updateCurrentTx(state, payload: Partial<State['currentTx']>) {
      return {
        ...state,
        currentTx: {
          ...state.currentTx,
          ...payload,
        },
      };
    },
  },
  effects: (dispatch) => ({
    async init(_: void, store) {
      const userData = await store.app.wallet.getSecurityEngineUserData();
      const rules = await store.app.wallet.getSecurityEngineRules();
      dispatch.securityEngine.setField({ userData, rules });
    },

    resetCurrentTx() {
      dispatch.securityEngine.updateCurrentTx({
        processedRules: [],
        ruleDrawer: {
          selectRule: null,
          visible: false,
        },
      });
    },

    openRuleDrawer(rule: {
      ruleConfig: RuleConfig;
      value?: number | string | boolean;
      level?: Level;
      ignored: boolean;
    }) {
      dispatch.securityEngine.updateCurrentTx({
        ruleDrawer: {
          selectRule: rule,
          visible: true,
        },
      });
    },

    closeRuleDrawer() {
      dispatch.securityEngine.updateCurrentTx({
        ruleDrawer: {
          selectRule: null,
          visible: false,
        },
      });
    },

    processAllRules(ids: string[]) {
      dispatch.securityEngine.updateCurrentTx({
        processedRules: ids,
      });
    },

    unProcessRule(id, store) {
      dispatch.securityEngine.updateCurrentTx({
        processedRules: store.securityEngine.currentTx.processedRules.filter(
          (i) => i !== id
        ),
      });
    },

    processRule(id: string, store) {
      dispatch.securityEngine.updateCurrentTx({
        processedRules: [...store.securityEngine.currentTx.processedRules, id],
      });
    },
  }),
});
