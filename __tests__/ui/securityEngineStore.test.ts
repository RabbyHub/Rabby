import {
  defaultRules,
  UserData,
} from '@rabby-wallet/rabby-security-engine/dist/rules';

import {
  getDefaultSecurityEngineState,
  useSecurityEngineStore,
} from '@/ui/state/securityEngine';
import { wallet } from '@/ui/wallet';

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

  test('tracks processed rules without changing background-backed data', () => {
    const store = useSecurityEngineStore.getState();

    store.processAllRules(['rule-1', 'rule-2']);
    useSecurityEngineStore.getState().unProcessRule('rule-1');
    useSecurityEngineStore.getState().processRule('rule-3');

    expect(
      useSecurityEngineStore.getState().currentTx.processedRules
    ).toEqual(['rule-2', 'rule-3']);
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
});
