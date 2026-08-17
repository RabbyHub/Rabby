import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import {
  initializeWalletStatusStore,
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
