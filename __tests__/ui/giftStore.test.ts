import type { Account } from '@/background/service/preference';
import {
  getDefaultGiftState,
  useGiftStore,
} from '@/ui/state/gift';
import { wallet } from '@/ui/wallet';
import { isFullVersionAccountType } from '@/utils/account';

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getGasAccountSig: jest.fn(),
    getHasAnyAccountClaimedGift: jest.fn(),
    openapi: {
      checkGasAccountGiftEligibility: jest.fn(),
    },
  },
}));

jest.mock('@/utils/account', () => ({
  isFullVersionAccountType: jest.fn(),
}));

const account = {
  address: '0xAbC',
  type: 'Simple Key Pair',
  brandName: 'Rabby',
} as Account;

describe('gift store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGiftStore.setState(getDefaultGiftState());
    (isFullVersionAccountType as jest.Mock).mockReturnValue(true);
    (wallet.getHasAnyAccountClaimedGift as jest.Mock).mockResolvedValue(false);
    (wallet.getGasAccountSig as jest.Mock).mockResolvedValue({});
  });

  test('keeps gift eligibility and request caches in a non-persisted store', () => {
    expect(useGiftStore.getState()).toMatchObject({
      giftEligibility: {},
      giftEligibilityCache: {},
      claimedGiftAddresses: [],
      giftUsdValue: 0,
      hasClaimedGift: false,
      _pendingRequests: {},
    });
    expect('persist' in useGiftStore).toBe(false);
  });

  test('initializes the global claimed flag from the wallet', async () => {
    (wallet.getHasAnyAccountClaimedGift as jest.Mock).mockResolvedValue(true);

    await useGiftStore.getState().initGiftStateAsync();

    expect(useGiftStore.getState().hasClaimedGift).toBe(true);
  });

  test('marks unsupported accounts as checked and ineligible', async () => {
    (isFullVersionAccountType as jest.Mock).mockReturnValue(false);

    await expect(
      useGiftStore.getState().checkGiftEligibilityAsync({
        currentAccount: account,
      })
    ).resolves.toBe(false);

    expect(useGiftStore.getState().giftEligibility['0xabc']).toEqual({
      isEligible: false,
      isChecked: true,
      isClaimed: false,
    });
    expect(wallet.getHasAnyAccountClaimedGift).not.toHaveBeenCalled();
  });

  test('deduplicates concurrent eligibility requests', async () => {
    let resolveEligibility!: (result: {
      has_eligibility: boolean;
      can_claimed_usd_value: number;
    }) => void;
    const eligibilityRequest = new Promise<{
      has_eligibility: boolean;
      can_claimed_usd_value: number;
    }>((resolve) => {
      resolveEligibility = resolve;
    });
    (
      wallet.openapi.checkGasAccountGiftEligibility as jest.Mock
    ).mockReturnValue(eligibilityRequest);

    const firstRequest = useGiftStore
      .getState()
      .checkGiftEligibilityAsync({ currentAccount: account });
    const secondRequest = useGiftStore
      .getState()
      .checkGiftEligibilityAsync({ currentAccount: account });

    await Promise.resolve();
    await Promise.resolve();
    expect(
      wallet.openapi.checkGasAccountGiftEligibility
    ).toHaveBeenCalledTimes(1);

    resolveEligibility({
      has_eligibility: true,
      can_claimed_usd_value: 25,
    });

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      true,
      true,
    ]);
    expect(useGiftStore.getState()).toMatchObject({
      giftEligibility: {
        '0xabc': {
          isEligible: true,
          isChecked: true,
          isClaimed: false,
        },
      },
      giftUsdValue: 25,
      _pendingRequests: {},
    });
  });

  test('reuses a valid negative cache entry without calling the API', async () => {
    useGiftStore.setState({
      giftEligibilityCache: {
        '0xabc': {
          isEligible: false,
          timestamp: Date.now(),
          hasGasAccountLogin: false,
        },
      },
    });

    await expect(
      useGiftStore.getState().checkGiftEligibilityAsync({
        currentAccount: account,
      })
    ).resolves.toBe(false);

    expect(
      wallet.openapi.checkGasAccountGiftEligibility
    ).not.toHaveBeenCalled();
    expect(useGiftStore.getState().giftEligibility['0xabc']).toMatchObject({
      isEligible: false,
      isChecked: true,
    });
  });

  test('marks a claimed address once and clears the displayed gift value', () => {
    useGiftStore.setState({ giftUsdValue: 25 });

    useGiftStore.getState().markGiftAsClaimed({ address: '0xAbC' });
    useGiftStore.getState().markGiftAsClaimed({ address: '0xABC' });

    expect(useGiftStore.getState()).toMatchObject({
      claimedGiftAddresses: ['0xabc'],
      hasClaimedGift: true,
      giftUsdValue: 0,
      giftEligibility: {
        '0xabc': {
          isEligible: false,
          isChecked: true,
          isClaimed: true,
        },
      },
    });
  });
});
