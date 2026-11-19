import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { createWithEqualityFn } from 'zustand/traditional';

// Same construction as useCombinedStore in src/ui/store.ts: one store that every
// slice update replaces, read through a selector compared with Object.is.
type TestRoot = {
  gasAccount: Record<string, any>;
  preference: Record<string, any>;
};
const mockStore = createWithEqualityFn<TestRoot>()(() => ({
  gasAccount: {
    sig: undefined,
    accountId: undefined,
    account: undefined,
    pendingHardwareAccount: undefined,
    autoLoginAccount: undefined,
    accountsWithGasAccountBalance: undefined,
  },
  preference: { locale: 'en' },
}));

jest.mock('@/ui/store', () => ({
  useRabbySelector: (selector: any) => mockStore(selector),
  useRabbyDispatch: () => ({
    gasAccount: {
      discoverRuntimeState: jest.fn().mockResolvedValue(undefined),
    },
  }),
}));
jest.mock('@/ui/utils', () => ({
  isSameAddress: (a: string, b: string) =>
    a?.toLowerCase() === b?.toLowerCase(),
  useWallet: () => ({}),
  getUiType: () => ({ isTab: false, isDesktop: false }),
}));
jest.mock('@/i18n', () => ({ t: (key: string) => key }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
// Signing UI pulled in by other hooks in the same module; not used here.
jest.mock(
  '@/ui/views/Approval/components/MiniPersonalMessgae/MiniSignPersonalMessage',
  () => ({ personalMessagePromise: jest.fn() })
);
jest.mock('@/ui/hooks/useMiniApprovalDirectSign', () => ({
  supportedDirectSign: jest.fn(),
  supportedHardwareDirectSign: jest.fn(),
}));
jest.mock('@/ui/component/MiniSignV2', () => ({ SignatureSteps: {} }));
jest.mock('@/ui/hooks/useAccounts', () => ({ useAccounts: () => ({}) }));
jest.mock('@/ui/utils/sendPersonalMessage', () => ({
  sendPersonalMessage: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const hooks = require('@/ui/views/GasAccount/hooks');

describe('gas account selectors', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  const renderCounting = (useHook: () => unknown) => {
    const state = { renders: 0, value: undefined as any };
    const Probe = () => {
      state.renders++;
      state.value = useHook();
      return null;
    };
    act(() => root.render(React.createElement(Probe)));
    return state;
  };

  const updateOtherSlice = () =>
    act(() =>
      mockStore.setState((s) => ({
        preference: { ...s.preference, locale: `${s.preference.locale}-x` },
      }))
    );

  it('useGasAccountSign ignores updates to other stores', () => {
    const probe = renderCounting(hooks.useGasAccountSign);
    const first = probe.value;
    updateOtherSlice();
    updateOtherSlice();
    expect(probe.renders).toBe(1);
    expect(probe.value).toBe(first);

    act(() =>
      mockStore.setState((s) => ({
        gasAccount: { ...s.gasAccount, sig: '0xsig', accountId: '0xid' },
      }))
    );
    expect(probe.renders).toBe(2);
    expect(probe.value.sig).toBe('0xsig');
  });

  it('useGasAccountDiscovery ignores updates to other stores', () => {
    const probe = renderCounting(() =>
      hooks.useGasAccountDiscovery({ autoRefresh: false })
    );
    updateOtherSlice();
    updateOtherSlice();
    expect(probe.renders).toBe(1);

    const accounts = [{ address: '0xabc' }];
    act(() =>
      mockStore.setState((s) => ({
        gasAccount: {
          ...s.gasAccount,
          accountsWithGasAccountBalance: accounts,
        },
      }))
    );
    expect(probe.renders).toBe(2);
    expect(probe.value.accountsWithGasAccountBalance).toBe(accounts);
  });
});
