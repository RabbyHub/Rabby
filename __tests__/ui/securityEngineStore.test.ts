import {
  defaultRules,
  UserData,
} from '@rabby-wallet/rabby-security-engine/dist/rules';

import {
  getDefaultSecurityEngineState,
  getSecurityRuleKey,
  SecurityEngineScopeProvider,
  SecurityEngineStore,
  useSecurityEngineStore,
} from '@/ui/state/securityEngine';
import { wallet } from '@/ui/wallet';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useShallow } from 'zustand/react/shallow';
import { cloneDeep } from 'lodash';

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getSecurityEngineRules: jest.fn(),
    getSecurityEngineUserData: jest.fn(),
  },
}));

const userData: UserData = {
  originWhitelist: ['https://trusted.example'],
  originBlacklist: [],
  contractWhitelist: [],
  contractBlacklist: [],
  addressWhitelist: [],
  addressBlacklist: [],
};

describe('security engine store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSecurityEngineStore.setState(getDefaultSecurityEngineState());
  });

  test('loads security data from the background service', async () => {
    (wallet.getSecurityEngineUserData as jest.Mock).mockResolvedValue(userData);
    (wallet.getSecurityEngineRules as jest.Mock).mockResolvedValue(
      defaultRules
    );

    await useSecurityEngineStore.getState().init();

    expect(useSecurityEngineStore.getState()).toMatchObject({
      userData,
      rules: defaultRules,
    });
  });

  test('keeps settings references stable on redundant initialization but refreshes changed settings', async () => {
    (wallet.getSecurityEngineUserData as jest.Mock).mockResolvedValue(userData);
    (wallet.getSecurityEngineRules as jest.Mock).mockResolvedValue(
      defaultRules
    );
    await useSecurityEngineStore.getState().init();
    const initial = useSecurityEngineStore.getState();
    const onChange = jest.fn();
    const unsubscribe = useSecurityEngineStore.subscribe(onChange);
    try {
      (wallet.getSecurityEngineUserData as jest.Mock).mockResolvedValue(
        cloneDeep(userData)
      );
      (wallet.getSecurityEngineRules as jest.Mock).mockResolvedValue(
        cloneDeep(defaultRules)
      );
      await useSecurityEngineStore.getState().init();
      expect(useSecurityEngineStore.getState()).toBe(initial);
      expect(onChange).not.toHaveBeenCalled();

      const changedRules = defaultRules.map((rule, index) =>
        index === 0 ? { ...rule, enable: !rule.enable } : rule
      );
      (wallet.getSecurityEngineRules as jest.Mock).mockResolvedValue(
        changedRules
      );
      await useSecurityEngineStore.getState().init();
      expect(useSecurityEngineStore.getState().rules).toBe(changedRules);
      expect(useSecurityEngineStore.getState().userData).toBe(initial.userData);

      const changedUserData = { ...userData, addressWhitelist: ['0x123'] };
      (wallet.getSecurityEngineUserData as jest.Mock).mockResolvedValue(
        changedUserData
      );
      await useSecurityEngineStore.getState().init();
      expect(useSecurityEngineStore.getState().userData).toBe(changedUserData);
      expect(useSecurityEngineStore.getState().rules).toBe(changedRules);
    } finally {
      unsubscribe();
    }
  });

  test('tracks processed rules without changing background-backed data', () => {
    const store = useSecurityEngineStore.getState();

    store.processAllRules(['rule-1', 'rule-2']);
    useSecurityEngineStore.getState().unProcessRule('rule-1');
    useSecurityEngineStore.getState().processRule('rule-3');

    expect(useSecurityEngineStore.getState().currentTx.processedRules).toEqual([
      'rule-2',
      'rule-3',
    ]);
    expect(wallet.getSecurityEngineUserData).not.toHaveBeenCalled();
    expect(wallet.getSecurityEngineRules).not.toHaveBeenCalled();
  });

  test('clears approval-local consent and drawer state for a new request', () => {
    const rule = {
      ruleConfig: defaultRules[0],
      ignored: true,
    };

    useSecurityEngineStore.getState().processRule('rule-1');
    useSecurityEngineStore.getState().openRuleDrawer(rule);
    useSecurityEngineStore.getState().resetCurrentTx();

    expect(useSecurityEngineStore.getState().currentTx).toEqual({
      processedRules: [],
      ruleDrawer: {
        selectRule: null,
        visible: false,
      },
    });
  });

  test('scopes row acknowledgements and drawer actions to their evaluated action', () => {
    const reactActEnvironment = globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    };
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    const root = createRoot(container);
    const scope = 'request:1:0';
    const id = defaultRules[0].id;
    let rowState: {
      processedRules: string[];
      openRuleDrawer: SecurityEngineStore['openRuleDrawer'];
    };
    let renderCount = 0;
    const Consumer = () => {
      rowState = useSecurityEngineStore(
        useShallow((state) => ({
          processedRules: state.currentTx.processedRules,
          openRuleDrawer: state.openRuleDrawer,
        }))
      );
      // Selector-free usage must also return a cached snapshot.
      useSecurityEngineStore();
      renderCount += 1;
      return null;
    };

    try {
      act(() => {
        root.render(
          React.createElement(
            SecurityEngineScopeProvider,
            { scope },
            React.createElement(Consumer)
          )
        );
      });
      expect(renderCount).toBe(1);
      act(() => {
        useSecurityEngineStore.getState().processRule(id, 'request:1:1');
      });
      expect(rowState!.processedRules).toEqual([]);
      act(() => {
        rowState!.openRuleDrawer({
          ruleConfig: defaultRules[0],
          ignored: false,
        });
      });
      const selected = useSecurityEngineStore.getState().currentTx.ruleDrawer
        .selectRule;
      expect(selected?.scope).toBe(scope);
      act(() => {
        useSecurityEngineStore.getState().processRule(id, selected?.scope);
      });
      expect(rowState!.processedRules).toEqual([id]);
      expect(
        useSecurityEngineStore.getState().currentTx.processedRules
      ).toEqual([
        getSecurityRuleKey(id, 'request:1:1'),
        getSecurityRuleKey(id, scope),
      ]);
      act(() => {
        useSecurityEngineStore.getState().unProcessRule(id, scope);
      });
      expect(rowState!.processedRules).toEqual([]);
      act(() => {
        useSecurityEngineStore.getState().resetCurrentTx();
      });
      expect(
        useSecurityEngineStore.getState().currentTx.processedRules
      ).toEqual([]);
      expect(
        useSecurityEngineStore.getState().currentTx.ruleDrawer.selectRule
      ).toBeNull();
    } finally {
      act(() => root.unmount());
      delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
    }
  });
});
