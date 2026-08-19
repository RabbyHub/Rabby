import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import {
  initializeWalletStatusStore,
  resolvePrivateRouteDecision,
  useWalletStatusStore,
} from '@/ui/state/walletStatus';
import { onWalletReconnect, wallet } from '@/ui/wallet';

jest.mock('webextension-polyfill', () => ({
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
    },
  },
  tabs: {
    onCreated: {
      addListener: jest.fn(),
    },
  },
}));

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getWalletStatus: jest.fn(),
  },
  onWalletReconnect: jest.fn(),
}));

const getWalletStatus = wallet.getWalletStatus as jest.Mock;
const mockedOnWalletReconnect = onWalletReconnect as jest.Mock;

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('wallet status store', () => {
  let reconnectListener: (() => void) | undefined;

  beforeAll(() => {
    mockedOnWalletReconnect.mockImplementation((listener) => {
      reconnectListener = listener;
      return jest.fn();
    });
  });

  beforeEach(() => {
    getWalletStatus.mockReset();
    useWalletStatusStore.setState({
      isBooted: false,
      isUnlocked: false,
      isInitialized: false,
      isSyncing: false,
    });
  });

  test('initializes from one authoritative background snapshot', async () => {
    getWalletStatus.mockResolvedValue({
      isBooted: true,
      isUnlocked: false,
    });

    await initializeWalletStatusStore();

    expect(getWalletStatus).toHaveBeenCalledTimes(1);
    expect(mockedOnWalletReconnect).toHaveBeenCalledTimes(1);
    expect(useWalletStatusStore.getState()).toMatchObject({
      isBooted: true,
      isUnlocked: false,
      isInitialized: true,
      isSyncing: false,
    });
  });

  test('waits for authoritative state after an unlock event', async () => {
    let resolveStatus!: (status: {
      isBooted: boolean;
      isUnlocked: boolean;
    }) => void;
    getWalletStatus.mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve;
      })
    );

    eventBus.emit(EVENTS.UNLOCK_WALLET);

    expect(useWalletStatusStore.getState()).toMatchObject({
      isUnlocked: false,
      isSyncing: true,
    });

    resolveStatus({ isBooted: true, isUnlocked: true });
    await flushPromises();

    expect(useWalletStatusStore.getState()).toMatchObject({
      isBooted: true,
      isUnlocked: true,
      isInitialized: true,
      isSyncing: false,
    });
  });

  test('hides protected state immediately after a lock event', async () => {
    useWalletStatusStore.setState({
      isBooted: true,
      isUnlocked: true,
      isInitialized: true,
    });
    getWalletStatus.mockResolvedValue({
      isBooted: true,
      isUnlocked: false,
    });

    eventBus.emit(EVENTS.LOCK_WALLET);

    expect(useWalletStatusStore.getState().isUnlocked).toBe(false);
    await flushPromises();
    expect(useWalletStatusStore.getState()).toMatchObject({
      isBooted: true,
      isUnlocked: false,
      isInitialized: true,
      isSyncing: false,
    });
  });

  test('does not let an older refresh overwrite a newer wallet status', async () => {
    let resolveOlderStatus!: (status: {
      isBooted: boolean;
      isUnlocked: boolean;
    }) => void;
    getWalletStatus
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOlderStatus = resolve;
        })
      )
      .mockResolvedValueOnce({ isBooted: true, isUnlocked: false });

    const olderRefresh = useWalletStatusStore.getState().sync();
    const newerRefresh = useWalletStatusStore.getState().sync();
    await newerRefresh;

    resolveOlderStatus({ isBooted: true, isUnlocked: true });
    await olderRefresh;

    expect(useWalletStatusStore.getState()).toMatchObject({
      isBooted: true,
      isUnlocked: false,
      isInitialized: true,
      isSyncing: false,
    });
  });

  test('treats an unreadable wallet status as locked', async () => {
    useWalletStatusStore.setState({
      isBooted: true,
      isUnlocked: true,
      isInitialized: true,
    });
    getWalletStatus.mockRejectedValue(new Error('background unavailable'));

    await expect(useWalletStatusStore.getState().sync()).rejects.toThrow(
      'background unavailable'
    );

    // Keeping the previous snapshot would gate protected routes on a stale
    // `isUnlocked: true` that nothing revalidates.
    expect(useWalletStatusStore.getState()).toMatchObject({
      isUnlocked: false,
      isSyncing: false,
    });
  });

  test('lets a newer refresh win over a failing older one', async () => {
    let rejectOlderStatus!: (error: Error) => void;
    getWalletStatus
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectOlderStatus = reject;
        })
      )
      .mockResolvedValueOnce({ isBooted: true, isUnlocked: true });

    const olderRefresh = useWalletStatusStore.getState().sync();
    await useWalletStatusStore.getState().sync();

    rejectOlderStatus(new Error('background unavailable'));
    await expect(olderRefresh).rejects.toThrow('background unavailable');

    expect(useWalletStatusStore.getState()).toMatchObject({
      isBooted: true,
      isUnlocked: true,
      isInitialized: true,
      isSyncing: false,
    });
  });

  test('resyncs without an optimistic write on a status change event', async () => {
    useWalletStatusStore.setState({
      isBooted: true,
      isUnlocked: true,
      isInitialized: true,
    });
    let resolveStatus!: (status: {
      isBooted: boolean;
      isUnlocked: boolean;
    }) => void;
    getWalletStatus.mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve;
      })
    );

    eventBus.emit(EVENTS.WALLET_STATUS_CHANGED);

    // `resetBooted` clears `booted` without locking, so guessing a direction
    // here would be wrong -- the authoritative read decides.
    expect(useWalletStatusStore.getState()).toMatchObject({
      isUnlocked: true,
      isSyncing: true,
    });

    resolveStatus({ isBooted: false, isUnlocked: false });
    await flushPromises();

    expect(useWalletStatusStore.getState()).toMatchObject({
      isBooted: false,
      isUnlocked: false,
      isInitialized: true,
      isSyncing: false,
    });
  });

  test('refreshes after the background reconnects', async () => {
    getWalletStatus.mockResolvedValue({
      isBooted: true,
      isUnlocked: true,
    });

    reconnectListener?.();
    await flushPromises();

    expect(getWalletStatus).toHaveBeenCalledTimes(1);
    expect(useWalletStatusStore.getState()).toMatchObject({
      isBooted: true,
      isUnlocked: true,
      isInitialized: true,
      isSyncing: false,
    });
  });
});

describe('private route decision', () => {
  const decide = (
    overrides: Partial<Parameters<typeof resolvePrivateRouteDecision>[0]> = {}
  ) =>
    resolvePrivateRouteDecision({
      isInitialized: true,
      isSyncing: false,
      isUnlocked: true,
      pathname: '/dashboard',
      ...overrides,
    });

  test('waits until the first authoritative snapshot arrives', () => {
    expect(decide({ isInitialized: false, isUnlocked: false })).toBe('pending');
    expect(decide({ isInitialized: false, isUnlocked: true })).toBe('pending');
  });

  test('keeps an unlocked tree mounted while a refresh is in flight', () => {
    // A background reconnect resyncs on every MV3 service-worker restart, so
    // blanking here would unmount the approval/import/send tree mid-flow.
    expect(decide({ isSyncing: true, isUnlocked: true })).toBe('render');
  });

  test('waits instead of redirecting while a locked snapshot refreshes', () => {
    expect(decide({ isSyncing: true, isUnlocked: false })).toBe('pending');
  });

  test('redirects once a settled snapshot says locked', () => {
    expect(decide({ isUnlocked: false })).toBe('redirect');
  });

  test('does not redirect again from /unlock', () => {
    expect(decide({ isUnlocked: false, pathname: '/unlock' })).toBe('pending');
  });
});
