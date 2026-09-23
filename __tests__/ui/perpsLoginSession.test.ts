import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { usePerpsState } from '@/ui/views/Perps/hooks/usePerpsState';
import { usePerpsProState } from '@/ui/views/DesktopPerps/hooks/usePerpsProState';
import { usePerpsDefaultAccount } from '@/ui/views/Perps/hooks/usePerpsDefaultAccount';
import {
  destroyPerpsSDK,
  getPerpsSDK,
  initPerpsAgentAccount,
} from '@/ui/views/Perps/sdkManager';

const mockWallet = { getPerpsAgentWallet: jest.fn() };
let mockPerpsState: Record<string, unknown>;
const mockPerps = {
  subscribeToUserData: jest.fn(),
  setCurrentPerpsAccount: jest.fn(),
  loginPerpsAccount: jest.fn(),
  setAccountNeedApproveAgent: jest.fn(),
  setAccountNeedApproveBuilderFee: jest.fn(),
  clearLocalLoadingHistory: jest.fn(),
  resetTradingState: jest.fn(),
};
jest.mock('@/ui/store', () => ({
  useRabbyDispatch: () => ({ perps: mockPerps }),
  useRabbySelector: (select: any) =>
    select({
      accountToDisplay: { accountsList: [] },
      perps: mockPerpsState,
    }),
}));
jest.mock('@/ui/utils', () => ({
  useWallet: () => mockWallet,
  isSameAddress: (left: string, right: string) =>
    left.toLowerCase() === right.toLowerCase(),
}));
jest.mock('@/constant', () => ({
  KEYRING_CLASS: { PRIVATE_KEY: 'private-key', MNEMONIC: 'mnemonic' },
  KEYRING_TYPE: {},
}));
jest.mock('@/constant/perps', () => ({ PERPS_AGENT_NAME: 'test-agent' }));
jest.mock('@/ui/views/Perps/constants', () => ({
  PERPS_AGENT_NAME: 'test-agent',
}));
jest.mock('@/ui/views/Perps/utils', () => ({}));
jest.mock('@/ui/views/Perps/sentry', () => ({ capturePerpsError: jest.fn() }));
jest.mock('@/ui/component/MiniSignV2', () => ({}));
jest.mock('@/ui/hooks/useMiniApprovalDirectSign', () => ({}));
jest.mock('@/ui/hooks/usePreference', () => ({ useThemeMode: () => ({}) }));
jest.mock('@/ui/views/DesktopPerps/utils/openDeleteAgentModal', () => ({}));
jest.mock('@/ui/views/DesktopPerps/components/PerpsToast', () => ({}));
jest.mock('antd', () => ({ message: { error: jest.fn() } }));
jest.mock('@rabby-wallet/hyperliquid-sdk/dist/client/http-client', () => ({
  HttpClient: jest.fn().mockImplementation(() => ({
    info: jest
      .fn()
      .mockResolvedValue([{ universe: [{ name: 'BTC', szDecimals: 5 }] }]),
  })),
}));

const account = {
  address: `0x${'aa'.repeat(20)}`,
  type: 'hardware',
  brandName: 'hardware',
};
const agentAddress = `0x${'bb'.repeat(20)}`;

describe.each([
  ['popup', () => usePerpsState({})],
  ['desktop', usePerpsProState],
] as const)('%s Perps login', (_name, useLogin) => {
  let root: Root;
  let login: ReturnType<typeof useLogin>['login'];
  let finishAgentCheck: () => void;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPerpsState = {
      isInitialized: true,
      localLoadingHistory: [],
      userAccountHistory: [],
      userFills: [],
    };
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    const sdk = getPerpsSDK();
    jest.spyOn(sdk.info, 'extraAgents').mockImplementation(
      () =>
        new Promise((resolve) => {
          finishAgentCheck = () =>
            resolve([
              {
                address: agentAddress,
                name: 'test-agent',
                validUntil: Date.now() + 2 * 24 * 60 * 60 * 1000,
              },
            ]);
        })
    );
    mockWallet.getPerpsAgentWallet.mockResolvedValue({
      vault: `0x${'11'.repeat(32)}`,
      preference: { agentAddress },
    });
    const Harness = () => {
      login = useLogin().login;
      return null;
    };
    root = createRoot(document.createElement('div'));
    await act(async () => root.render(React.createElement(Harness)));
  });

  afterEach(() => {
    act(() => root.unmount());
    destroyPerpsSDK();
    jest.restoreAllMocks();
  });

  test.each([false, true])(
    'drops a pending agent check after lock (new SDK: %s)',
    async (recreate) => {
      const oldSdk = getPerpsSDK();
      const pending = login(account);
      await Promise.resolve();
      expect(oldSdk.info.extraAgents).toHaveBeenCalled();

      destroyPerpsSDK();
      if (recreate) getPerpsSDK();
      finishAgentCheck();
      await pending;

      expect(getPerpsSDK().isHaveAgent).toBe(false);
      expect(oldSdk.isHaveAgent).toBe(false);
      expect(mockPerps.setCurrentPerpsAccount).not.toHaveBeenCalled();
      expect(mockPerps.loginPerpsAccount).not.toHaveBeenCalled();
      expect(mockPerps.setAccountNeedApproveAgent).not.toHaveBeenCalled();
    }
  );

  test('still logs in when the session is unchanged', async () => {
    const pending = login(account);
    await Promise.resolve();
    finishAgentCheck();
    await pending;

    expect(getPerpsSDK().isHaveAgent).toBe(true);
    expect(mockPerps.setCurrentPerpsAccount).toHaveBeenCalledWith(account);
    expect(mockPerps.loginPerpsAccount).toHaveBeenCalled();
  });
});

test.each([false, true])(
  'restores dashboard subscriptions after unlock (signer ready: %s)',
  async (signerReady) => {
    jest.clearAllMocks();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    mockPerpsState = { isInitialized: false, currentPerpsAccount: account };
    const sdk = getPerpsSDK();
    if (signerReady) {
      initPerpsAgentAccount(
        sdk,
        account.address,
        `0x${'11'.repeat(32)}`,
        agentAddress
      );
    }
    const Harness = () => {
      usePerpsDefaultAccount({});
      return null;
    };
    const root = createRoot(document.createElement('div'));
    try {
      await act(async () => root.render(React.createElement(Harness)));

      expect(mockPerps.subscribeToUserData).toHaveBeenCalledWith({
        ...account,
        isPro: false,
      });
      expect(sdk.exchange?.address).toBe(account.address);
      expect(sdk.isHaveAgent).toBe(signerReady);
    } finally {
      act(() => root.unmount());
      destroyPerpsSDK();
    }
  }
);
