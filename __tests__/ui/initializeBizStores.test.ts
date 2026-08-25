import { useAccountStore } from '@/ui/state/account';
import { initializeBridgeStore } from '@/ui/state/bridge';
import { initializeGiftStore } from '@/ui/state/gift';
import { initializeGasAccountStore } from '@/ui/state/gasAccount';
import { initializeBizStores } from '@/ui/state/initializeBizStores';
import { initializePerpsStore } from '@/ui/state/perps';
import { initializePreferenceStore } from '@/ui/state/preference';

jest.mock('@/ui/state/account', () => ({
  useAccountStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/ui/state/bridge', () => ({
  initializeBridgeStore: jest.fn(),
}));

jest.mock('@/ui/state/gift', () => ({
  initializeGiftStore: jest.fn(),
}));

jest.mock('@/ui/state/gasAccount', () => ({
  initializeGasAccountStore: jest.fn(),
}));

jest.mock('@/ui/state/perps', () => ({
  initializePerpsStore: jest.fn(),
}));

jest.mock('@/ui/state/preference', () => ({
  initializePreferenceStore: jest.fn(),
}));

describe('initializeBizStores', () => {
  test('preserves the startup order without using a store action', async () => {
    const account = {
      address: '0xabc',
      type: 'Simple Key Pair',
      brandName: 'Rabby',
    };
    const accountStore = {
      getCurrentAccountAsync: jest.fn().mockResolvedValue(account),
      onAccountChanged: jest.fn().mockResolvedValue(undefined),
      getSceneAccountMap: jest.fn().mockResolvedValue(undefined),
    };
    (useAccountStore.getState as jest.Mock).mockReturnValue(accountStore);
    const mockedInitializeGiftStore = initializeGiftStore as jest.Mock;
    mockedInitializeGiftStore.mockResolvedValue(undefined);

    await initializeBizStores();

    expect(initializePreferenceStore).toHaveBeenCalledTimes(1);
    expect(initializeBridgeStore).toHaveBeenCalledTimes(1);
    expect(initializeGasAccountStore).toHaveBeenCalledTimes(1);
    expect(initializePerpsStore).toHaveBeenCalledTimes(1);
    expect(accountStore.getCurrentAccountAsync).toHaveBeenCalledTimes(1);
    expect(accountStore.onAccountChanged).toHaveBeenCalledWith(account.address);
    expect(initializeGiftStore).toHaveBeenCalledTimes(1);
    expect(accountStore.getSceneAccountMap).toHaveBeenCalledTimes(1);

    expect(
      accountStore.onAccountChanged.mock.invocationCallOrder[0]
    ).toBeLessThan(mockedInitializeGiftStore.mock.invocationCallOrder[0]);
    expect(mockedInitializeGiftStore.mock.invocationCallOrder[0]).toBeLessThan(
      accountStore.getSceneAccountMap.mock.invocationCallOrder[0]
    );
  });
});
