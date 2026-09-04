import type { BridgeServiceStore } from '@/background/service/bridge';
import type { BridgeAggregator } from '@/background/service/openapi';
import eventBus from '@/eventBus';
import {
  initializeBridgeStore,
  useBridgeStore,
} from '@/ui/state/bridge';
import { wallet } from '@/ui/wallet';
import { BROADCAST_TO_UI_EVENTS } from '@/utils/broadcastToUI';
import { findChain } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import type { TokenItem } from '@rabby-wallet/rabby-api/dist/types';

jest.mock(
  '@rabby-wallet/rabby-bridge',
  () => ({ ALL_SUPPORTED_BRIDGE_CHAINS: ['ETH'] }),
  { virtual: true }
);

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
    getStorageSnapshot: jest.fn(),
    setStorageItem: jest.fn(),
    openapi: {
      getBridgeAggregatorList: jest.fn(),
      getBridgeSupportChainV2: jest.fn(),
    },
  },
}));

const ethServerId = findChain({ enum: CHAINS_ENUM.ETH })!.serverId;
const fromToken = {
  chain: ethServerId,
  id: '0xfrom',
} as TokenItem;
const aggregator = {
  id: 'aggregator-1',
  name: 'Aggregator 1',
} as BridgeAggregator;
const bridgeState: BridgeServiceStore = {
  selectedChain: CHAINS_ENUM.ETH,
  selectedFromToken: fromToken,
  selectedToToken: undefined,
  selectedAggregators: ['aggregator-1'],
  txQuotes: {},
  unlimitedAllowance: false,
  sortIncludeGasFee: true,
  firstOpen: false,
};

describe('bridge store', () => {
  beforeAll(async () => {
    (wallet.getStorageSnapshot as jest.Mock).mockResolvedValue({
      origin: 'background-1',
      revision: 0,
      state: bridgeState,
    });
    (wallet.setStorageItem as jest.Mock).mockResolvedValue(undefined);
    (wallet.openapi.getBridgeAggregatorList as jest.Mock).mockResolvedValue([
      aggregator,
    ]);
    (wallet.openapi.getBridgeSupportChainV2 as jest.Mock).mockResolvedValue([
      ethServerId,
    ]);

    await initializeBridgeStore();
  });

  afterAll(() => {
    useBridgeStore.persist.destroy();
  });

  test('hydrates persisted state and records the initial chain', () => {
    expect(useBridgeStore.getState()).toMatchObject({
      ...bridgeState,
      $$initialSelectedChain: CHAINS_ENUM.ETH,
      aggregatorsListInit: true,
      aggregatorsList: [aggregator],
      supportedChains: [CHAINS_ENUM.ETH],
    });
  });

  test('optimistically persists bridge selections', async () => {
    (wallet.setStorageItem as jest.Mock).mockClear();

    useBridgeStore.getState().setSelectedAggregators(['aggregator-2']);
    await useBridgeStore.persist.flush();

    expect(useBridgeStore.getState().selectedAggregators).toEqual([
      'aggregator-2',
    ]);
    expect(wallet.setStorageItem).toHaveBeenCalledWith(
      'bridge',
      { selectedAggregators: ['aggregator-2'] },
      []
    );
  });

  test('preserves token clears across JSON transport', async () => {
    (wallet.setStorageItem as jest.Mock).mockClear();

    useBridgeStore.getState().setSelectedFromToken(undefined);
    await useBridgeStore.persist.flush();

    expect(wallet.setStorageItem).toHaveBeenCalledWith(
      'bridge',
      { selectedFromToken: undefined },
      ['selectedFromToken']
    );
  });

  test('updates fetched UI metadata without persisting it', async () => {
    const nextAggregator = {
      id: 'aggregator-2',
      name: 'Aggregator 2',
    } as BridgeAggregator;
    (wallet.openapi.getBridgeAggregatorList as jest.Mock).mockResolvedValue([
      nextAggregator,
    ]);
    (wallet.setStorageItem as jest.Mock).mockClear();

    await useBridgeStore.getState().fetchAggregatorsList();
    await useBridgeStore.persist.flush();

    expect(useBridgeStore.getState().aggregatorsList).toEqual([
      nextAggregator,
    ]);
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });

  test('applies background changes without writing them back', () => {
    (wallet.setStorageItem as jest.Mock).mockClear();

    eventBus.emit(BROADCAST_TO_UI_EVENTS.storeChanged, {
      bgStoreName: 'bridge',
      changedKey: 'selectedChain',
      changedKeys: ['selectedChain'],
      partials: { selectedChain: CHAINS_ENUM.BSC },
      origin: 'background-1',
      revision: 1,
    });

    expect(useBridgeStore.getState().selectedChain).toBe(CHAINS_ENUM.BSC);
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });
});
