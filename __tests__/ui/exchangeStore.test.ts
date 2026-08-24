import type { WalletControllerType } from '@/ui/utils';
import {
  getCexInfo,
  getDefaultExchangeState,
  globalSupportCexList,
  useExchangeStore,
} from '@/ui/state/exchange';
import { wallet } from '@/ui/wallet';

jest.mock('@/ui/wallet', () => ({
  wallet: {
    openapi: {
      getCexSupportList: jest.fn(),
    },
  },
}));

const mockedGetCexSupportList = wallet.openapi
  .getCexSupportList as jest.Mock;

describe('exchange store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalSupportCexList.splice(0);
    useExchangeStore.setState(getDefaultExchangeState());
  });

  test('uses the built-in exchange list by default', () => {
    expect(useExchangeStore.getState().exchanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'binance', name: 'Binance' }),
        expect.objectContaining({ id: 'okex', name: 'OKX' }),
      ])
    );
    expect(useExchangeStore).not.toHaveProperty('persist');
  });

  test('loads and maps the remote exchange list', async () => {
    mockedGetCexSupportList.mockResolvedValue([
      {
        id: 'remote-cex',
        name: 'Remote CEX',
        logo_url: 'https://example.com/remote-cex.png',
      },
    ]);

    await useExchangeStore.getState().init();

    const expectedExchange = {
      id: 'remote-cex',
      name: 'Remote CEX',
      logo: 'https://example.com/remote-cex.png',
    };
    expect(useExchangeStore.getState().exchanges).toEqual([expectedExchange]);
    expect(globalSupportCexList).toEqual([expectedExchange]);
  });

  test('keeps the built-in list when the remote request fails', async () => {
    mockedGetCexSupportList.mockRejectedValue(new Error('network error'));

    await expect(useExchangeStore.getState().init()).resolves.toBeUndefined();

    expect(useExchangeStore.getState().exchanges).toEqual(
      getDefaultExchangeState().exchanges
    );
    expect(globalSupportCexList).toEqual(
      getDefaultExchangeState().exchanges
    );
  });

  test('finds exchange information case-insensitively', async () => {
    globalSupportCexList.push({
      id: 'binance',
      name: 'Binance',
      logo: 'binance.png',
    });
    const walletController = {
      getCexId: jest.fn().mockResolvedValue('BINANCE'),
    } as unknown as WalletControllerType;

    await expect(getCexInfo('0x123', walletController)).resolves.toEqual({
      id: 'BINANCE',
      name: 'Binance',
      logo: 'binance.png',
    });
  });
});
