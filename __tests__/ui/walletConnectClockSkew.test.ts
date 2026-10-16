import React, { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import eventBus from '@/eventBus';
import { EVENTS, CHAINS_ENUM, WALLETCONNECT_STATUS_MAP } from '@/constant';
import { WALLETCONNECT_CLOCK_SKEW } from '@/utils/walletconnect-error';
import ScanCopyQRCode from '@/ui/component/ScanCopyQRCode';
import Process from '@/ui/views/Approval/components/WatchAddressWaiting/Process';

const mockWallet = {
  getWalletConnectTransportErrorCode: jest.fn(),
};
let mockSessionStatus: string | undefined;

jest.mock('@/constant', () => ({
  EVENTS: {
    WALLETCONNECT: {
      TRANSPORT_ERROR: 'TRANSPORT_ERROR',
      INITED: 'WALLETCONNECT_INITED',
    },
  },
  CHAINS_ENUM: { ETH: 'ETH' },
  KEYRING_CLASS: { WALLETCONNECT: 'WalletConnect', Coinbase: 'Coinbase' },
  WALLETCONNECT_STATUS_MAP: {
    PENDING: 1,
    CONNECTED: 2,
    WAITING: 3,
    SUBMITTED: 4,
    REJECTED: 5,
    FAILED: 6,
  },
  WALLET_BRAND_CONTENT: { WALLETCONNECT: { icon: '' } },
}));
jest.mock('@/ui/utils/WalletContext', () => ({
  useWallet: () => mockWallet,
}));
jest.mock('ui/utils', () => ({
  useCommonPopupView: () => ({ setClassName: jest.fn(), setTitle: jest.fn() }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/ui/component/WalletConnect/useSessionStatus', () => ({
  useSessionStatus: () => ({ status: mockSessionStatus }),
}));
jest.mock('@/ui/component/WalletConnect/ConnectStatus', () => ({
  ConnectStatus: () => null,
}));
jest.mock('@/ui/component/WalletConnect/useDisplayBrandName', () => ({
  useDisplayBrandName: () => ['WalletConnect'],
  WALLET_BRAND_NAME_KEY: {},
}));
jest.mock('@/ui/component/WalletConnect/useWalletConnectIcon', () => ({
  useWalletConnectIcon: () => '',
}));
jest.mock('react-use', () => ({ useInterval: jest.fn() }));
jest.mock('@/ui/component/Spin', () => ({
  __esModule: true,
  default: () => require('react').createElement('div', { role: 'progressbar' }),
}));
jest.mock('@/ui/component/ThemeMode/ThemeIcon', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('qrcode.react', () => ({
  __esModule: true,
  default: ({ value }: { value: string }) =>
    require('react').createElement('div', { 'data-qr': value }),
}));
jest.mock('antd', () => ({
  Input: { TextArea: () => null },
  message: { success: jest.fn() },
}));
jest.mock(
  '@/ui/views/Approval/components/Popup/ApprovalPopupContainer',
  () => ({
    ApprovalPopupContainer: ({ status }: { status: string }) =>
      require('react').createElement('div', { 'data-sign-status': status }),
  })
);

describe('WalletConnect clock skew guidance', () => {
  let root: Root;
  let container: HTMLDivElement;
  const refresh = jest.fn();
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    eventBus.events = {};
    mockSessionStatus = undefined;
    mockWallet.getWalletConnectTransportErrorCode.mockResolvedValue(undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  afterAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  const renderQr = async (uri = '') => {
    await act(async () => {
      root.render(
        createElement(ScanCopyQRCode, {
          showURL: false,
          changeShowURL: jest.fn(),
          refreshFun: refresh,
          qrcodeURL: uri,
          canChangeBridge: false,
        })
      );
    });
  };
  const emitClockError = () => {
    act(() => {
      eventBus.emit(EVENTS.WALLETCONNECT.TRANSPORT_ERROR, {
        code: WALLETCONNECT_CLOCK_SKEW,
      });
    });
  };
  const warning = () => container.querySelector('[role="status"]');

  it('replaces pending QR loading with guidance and waits for an explicit retry', async () => {
    await renderQr();
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
    emitClockError();
    expect(warning()?.textContent).toContain(
      'page.newAddress.walletConnect.clockSkewError'
    );
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    expect(refresh).not.toHaveBeenCalled();

    act(() => container.querySelector<HTMLButtonElement>('button')!.click());
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(warning()).not.toBeNull();

    act(() =>
      eventBus.emit(EVENTS.WALLETCONNECT.INITED, { uri: 'wc:recovered' })
    );
    expect(warning()).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not automatically refresh a disconnected session while showing the clock error', async () => {
    await renderQr();
    emitClockError();
    mockSessionStatus = 'DISCONNECTED';
    await renderQr();
    expect(refresh).not.toHaveBeenCalled();
    expect(warning()).not.toBeNull();
  });

  it('keeps the guidance when an unrelated connector initializes', async () => {
    await renderQr();
    emitClockError();
    act(() => {
      eventBus.emit(EVENTS.WALLETCONNECT.INITED, {
        uri: 'https://keys.coinbase.com/connect',
      });
    });
    expect(warning()).not.toBeNull();
  });

  it.each([false, undefined])(
    'does not cover a Coinbase QR for isWalletConnect=%s when cached or runtime clock errors exist',
    async (isWalletConnect) => {
      mockWallet.getWalletConnectTransportErrorCode.mockResolvedValue(
        WALLETCONNECT_CLOCK_SKEW
      );
      await act(async () => {
        root.render(
          createElement(ScanCopyQRCode, {
            showURL: false,
            changeShowURL: jest.fn(),
            refreshFun: refresh,
            qrcodeURL: 'https://keys.coinbase.com/connect',
            canChangeBridge: false,
            isWalletConnect,
            account:
              isWalletConnect === undefined
                ? { address: '0x123', brandName: 'Coinbase', type: 'Coinbase' }
                : undefined,
          })
        );
      });
      emitClockError();
      expect(warning()).toBeNull();
      expect(container.querySelector('[data-qr]')).not.toBeNull();
      expect(
        mockWallet.getWalletConnectTransportErrorCode
      ).not.toHaveBeenCalled();
    }
  );

  it('shows a previous clock error when a new QR view mounts', async () => {
    mockWallet.getWalletConnectTransportErrorCode.mockResolvedValue(
      WALLETCONNECT_CLOCK_SKEW
    );
    await renderQr();
    expect(warning()).not.toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('keeps a runtime error when an older hydration query returns no error', async () => {
    let resolveHydration!: (code: undefined) => void;
    mockWallet.getWalletConnectTransportErrorCode.mockReturnValue(
      new Promise<undefined>((resolve) => {
        resolveHydration = resolve;
      })
    );
    await renderQr();
    emitClockError();
    await act(async () => resolveHydration(undefined));
    expect(warning()).not.toBeNull();
  });

  it('does not restore a stale hydrated error after a successful initialization', async () => {
    let resolveHydration!: (code: string) => void;
    mockWallet.getWalletConnectTransportErrorCode.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveHydration = resolve;
      })
    );
    await renderQr();
    emitClockError();
    act(() =>
      eventBus.emit(EVENTS.WALLETCONNECT.INITED, { uri: 'wc:recovered' })
    );
    await act(async () => resolveHydration(WALLETCONNECT_CLOCK_SKEW));
    expect(warning()).toBeNull();
  });

  it('does not mislabel other transport errors or a failed state query as clock skew', async () => {
    mockWallet.getWalletConnectTransportErrorCode.mockRejectedValue(
      new Error('background unavailable')
    );
    await renderQr();
    act(() => {
      eventBus.emit(EVENTS.WALLETCONNECT.TRANSPORT_ERROR, { code: 'OTHER' });
      eventBus.emit(EVENTS.WALLETCONNECT.TRANSPORT_ERROR);
    });
    expect(warning()).toBeNull();
  });

  it('shows guidance while waiting without retrying or settling a signing request', async () => {
    const onRetry = jest.fn();
    const onCancel = jest.fn();
    const onDone = jest.fn();
    await act(async () => {
      root.render(
        createElement(Process, {
          chain: CHAINS_ENUM.ETH,
          result: '',
          status: WALLETCONNECT_STATUS_MAP.WAITING,
          account: {
            address: '0x123',
            brandName: 'WalletConnect',
            type: 'WalletConnect',
          },
          error: null,
          onRetry,
          onCancel,
          onDone,
        })
      );
    });
    emitClockError();
    expect(warning()).not.toBeNull();
    expect(container.querySelector('button')?.textContent).toBe(
      'global.cancelButton'
    );
    expect(onRetry).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    act(() => container.querySelector<HTMLButtonElement>('button')!.click());
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('preserves completion controls after a signing result has already arrived', async () => {
    await act(async () => {
      root.render(
        createElement(Process, {
          chain: CHAINS_ENUM.ETH,
          result: '0xsigned',
          status: WALLETCONNECT_STATUS_MAP.SUBMITTED,
          account: {
            address: '0x123',
            brandName: 'WalletConnect',
            type: 'WalletConnect',
          },
          error: null,
          onRetry: jest.fn(),
          onCancel: jest.fn(),
          onDone: jest.fn(),
        })
      );
    });
    emitClockError();
    expect(warning()).toBeNull();
    expect(
      container.querySelector('[data-sign-status="RESOLVED"]')
    ).not.toBeNull();
  });

  it('does not show WalletConnect clock guidance in a Coinbase signing process', async () => {
    mockWallet.getWalletConnectTransportErrorCode.mockResolvedValue(
      WALLETCONNECT_CLOCK_SKEW
    );
    await act(async () => {
      root.render(
        createElement(Process, {
          chain: CHAINS_ENUM.ETH,
          result: '',
          status: WALLETCONNECT_STATUS_MAP.WAITING,
          account: {
            address: '0x123',
            brandName: 'Coinbase',
            type: 'Coinbase',
          },
          error: null,
          onRetry: jest.fn(),
          onCancel: jest.fn(),
          onDone: jest.fn(),
        })
      );
    });
    emitClockError();
    expect(warning()).toBeNull();
    expect(
      container.querySelector('[data-sign-status="WAITING"]')
    ).not.toBeNull();
    expect(
      mockWallet.getWalletConnectTransportErrorCode
    ).not.toHaveBeenCalled();
  });
});
