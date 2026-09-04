import type { GasAccountServiceStore } from '@/background/service/gasAccount';
import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import {
  getDefaultGasAccountState,
  useGasAccountStore,
} from '@/ui/state/gasAccount';
import { wallet } from '@/ui/wallet';
import { prefetchGasAccountBridgeSupportTokenList } from '@/ui/views/GasAccount/utils/bridgeSupportTokens';

jest.mock('@/eventBus', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
  },
}));

jest.mock('@/ui/wallet', () => ({
  wallet: {
    discoverGasAccountRuntimeState: jest.fn(),
    getGasAccountData: jest.fn(),
    setGasAccountSig: jest.fn(),
    openapi: {},
  },
}));

jest.mock('@/ui/views/GasAccount/utils/bridgeSupportTokens', () => ({
  prefetchGasAccountBridgeSupportTokenList: jest.fn(),
}));

const account = {
  address: '0xabc',
  type: 'Simple Key Pair',
  brandName: 'Rabby',
};

const serviceState = (): GasAccountServiceStore => ({
  sig: 'sig',
  accountId: account.address,
  account,
  hasAnyAccountClaimedGift: false,
  hasEverLoggedIn: true,
  pendingHardwareAccount: undefined,
  autoLoginAccount: undefined,
  accountsWithGasAccountBalance: [{ ...account, balance: 12 }],
});

describe('gas-account store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGasAccountStore.setState(getDefaultGasAccountState());
    (prefetchGasAccountBridgeSupportTokenList as jest.Mock).mockResolvedValue(
      undefined
    );
    (wallet.getGasAccountData as jest.Mock).mockResolvedValue(serviceState());
  });

  test('keeps the background snapshot in a non-persisted UI store', () => {
    expect(useGasAccountStore.getState()).toMatchObject({
      sig: undefined,
      accountId: undefined,
      account: undefined,
      pendingHardwareAccount: undefined,
      autoLoginAccount: undefined,
      accountsWithGasAccountBalance: [],
    });
    expect('persist' in useGasAccountStore).toBe(false);
  });

  test('syncs the complete background state', async () => {
    const data = serviceState();
    (wallet.getGasAccountData as jest.Mock).mockResolvedValue(data);

    await useGasAccountStore.getState().syncState();

    expect(wallet.getGasAccountData).toHaveBeenCalledWith();
    expect(useGasAccountStore.getState()).toMatchObject(data);
  });

  test('syncs one requested background field', async () => {
    const pendingHardwareAccount = {
      address: '0xdef',
      type: 'Ledger Hardware',
      brandName: 'Ledger',
    };
    (wallet.getGasAccountData as jest.Mock).mockResolvedValue(
      pendingHardwareAccount
    );

    await useGasAccountStore
      .getState()
      .syncState('pendingHardwareAccount');

    expect(wallet.getGasAccountData).toHaveBeenCalledWith(
      'pendingHardwareAccount'
    );
    expect(useGasAccountStore.getState().pendingHardwareAccount).toEqual(
      pendingHardwareAccount
    );
  });

  test('initializes event synchronization and bridge-token prefetching', async () => {
    await useGasAccountStore.getState().init();

    expect(eventBus.addEventListener).toHaveBeenCalledTimes(3);
    expect(eventBus.addEventListener).toHaveBeenCalledWith(
      EVENTS.GAS_ACCOUNT.LOG_OUT,
      expect.any(Function)
    );
    expect(eventBus.addEventListener).toHaveBeenCalledWith(
      EVENTS.GAS_ACCOUNT.LOG_IN,
      expect.any(Function)
    );
    expect(eventBus.addEventListener).toHaveBeenCalledWith(
      EVENTS.GAS_ACCOUNT.DISCOVERY_UPDATED,
      expect.any(Function)
    );
    expect(prefetchGasAccountBridgeSupportTokenList).toHaveBeenCalledWith({
      wallet,
    });
    expect(useGasAccountStore.getState()).toMatchObject(serviceState());

    const logoutListener = (eventBus.addEventListener as jest.Mock).mock.calls.find(
      ([event]) => event === EVENTS.GAS_ACCOUNT.LOG_OUT
    )?.[1];
    logoutListener();

    expect(useGasAccountStore.getState()).toMatchObject({
      sig: undefined,
      accountId: undefined,
      account: undefined,
    });
  });

  test('forwards session changes to the background', async () => {
    (wallet.setGasAccountSig as jest.Mock).mockResolvedValue(undefined);

    await useGasAccountStore.getState().setGasAccountSig({
      sig: 'next-sig',
      account,
    });

    expect(wallet.setGasAccountSig).toHaveBeenCalledWith('next-sig', account);
  });

  test('discovers runtime state and updates the local snapshot', async () => {
    const data = {
      ...serviceState(),
      autoLoginAccount: account,
    };
    (wallet.discoverGasAccountRuntimeState as jest.Mock).mockResolvedValue(data);

    await expect(
      useGasAccountStore.getState().discoverRuntimeState({ force: true })
    ).resolves.toBe(data);

    expect(wallet.discoverGasAccountRuntimeState).toHaveBeenCalledWith({
      force: true,
    });
    expect(useGasAccountStore.getState()).toMatchObject(data);
  });
});
