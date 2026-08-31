import bridgeService, {
  bridgeStoreSchema,
} from '@/background/service/bridge';
import { patchPersistStore } from '@/background/utils';
import { CHAINS_ENUM } from '@debank/common';

jest.mock('@/background/utils', () => ({
  createPersistStore: jest.fn(),
  patchPersistStore: jest.fn((store, partials) => {
    Object.assign(store, partials);
  }),
}));

jest.mock('background/service', () => ({
  openapiService: {
    postBridgeHistory: jest.fn(),
  },
}));

describe('bridge service persistence', () => {
  beforeEach(() => {
    bridgeService.store = bridgeStoreSchema.parse({});
    (patchPersistStore as jest.Mock).mockClear();
  });

  test('provides validated defaults for persisted bridge state', () => {
    expect(bridgeStoreSchema.parse({})).toEqual({
      selectedChain: null,
      selectedAggregators: [],
      txQuotes: {},
      unlimitedAllowance: false,
      sortIncludeGasFee: true,
      firstOpen: true,
    });
    expect(
      bridgeStoreSchema.safeParse({
        selectedChain: CHAINS_ENUM.ETH,
        selectedFromToken: { chain: 'eth' },
      }).success
    ).toBe(false);
    expect(
      bridgeStoreSchema.safeParse({
        txQuotes: { invalid: { aggregator_id: 'aggregator-1' } },
      }).success
    ).toBe(false);
  });

  test('routes bridge updates through atomic persisted patches', () => {
    bridgeService.setSelectedChain(CHAINS_ENUM.ETH);
    bridgeService.setBridgeAggregators(['aggregator-1']);

    expect(patchPersistStore).toHaveBeenNthCalledWith(1, bridgeService.store, {
      selectedChain: CHAINS_ENUM.ETH,
    });
    expect(patchPersistStore).toHaveBeenNthCalledWith(2, bridgeService.store, {
      selectedAggregators: ['aggregator-1'],
    });
  });
});
