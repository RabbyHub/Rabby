import { BigNumber } from 'bignumber.js';
import { GasLevel, Tx } from 'background/service/openapi';
import { CHAINS_ENUM } from '@debank/common';
import { createPersistStore } from 'background/utils';
import axios from 'axios';
import {
  findChain,
  findChainByEnum,
  findChainByID,
  isTestnet,
  updateChainStore,
} from '@/utils/chain';
import {
  defineChain,
  createClient,
  Client,
  http,
  toHex,
  formatEther,
} from 'viem';
import { omit } from 'lodash';
import { intToHex } from 'ethereumjs-util';
import {
  estimateGas,
  getBalance,
  getGasPrice,
  getTransaction,
  getTransactionCount,
} from 'viem/actions';
import { satisfies } from 'semver';

export interface TestnetChainBase {
  id: number;
  name: string;
  nativeTokenSymbol: string;
  rpcUrl: string;
  scanLink?: string;
}

export interface TestnetChain extends TestnetChainBase {
  nativeTokenAddress: string;
  hex: string;
  network: string;
  enum: CHAINS_ENUM;
  serverId: string;
  nativeTokenLogo: string;
  eip: Record<string, any>;
  nativeTokenDecimals: number;
  scanLink: string;
  isTestnet?: boolean;
  logo: string;
  whiteLogo?: string;
}

export interface RPCItem {
  url: string;
  enable: boolean;
}

export interface CustomTestnetTokenBase {
  address: string;
  chainId: number;
}

export type CutsomTestnetServiceStore = {
  customTestnet: Record<string, TestnetChain>;
  customTokenList: CustomTestnetTokenBase[];
};

const MAX = 4_294_967_295;
let idCounter = Math.floor(Math.random() * MAX);

function getUniqueId(): number {
  idCounter = (idCounter + 1) % MAX;
  return idCounter;
}

class CustomTestnetService {
  store: CutsomTestnetServiceStore = {
    customTestnet: {},
    customTokenList: [],
  };

  chains: Record<string, Client> = {};

  init = async () => {
    const storage = await createPersistStore<CutsomTestnetServiceStore>({
      name: 'customTestnet',
      template: {
        customTestnet: {},
        customTokenList: [],
      },
    });
    this.store = storage || this.store;
    Object.values(this.store.customTestnet).forEach((chain) => {
      const client = createClientByChain(chain);
      this.chains[chain.id] = client;
    });
    updateChainStore({
      testnetList: Object.values(this.store.customTestnet).map((item) => {
        return createTestnetChain(item);
      }),
    });
  };
  add = async (chain: TestnetChainBase) => {
    return this._update(chain, true);
  };

  update = async (chain: TestnetChainBase) => {
    return this._update(chain);
  };

  _update = async (chain: TestnetChainBase, isAdd?: boolean) => {
    const local = findChain({
      id: +chain.id,
    });
    if (isAdd && local) {
      if (local.isTestnet) {
        return {
          error: {
            key: 'id',
            message: "You've already added this chain",
          },
        };
      } else {
        return {
          error: {
            key: 'id',
            message: 'Chain already supported by Rabby Wallet',
          },
        };
      }
    }
    try {
      const { data } = await axios.post(
        chain.rpcUrl,
        {
          jsonrpc: '2.0',
          id: getUniqueId(),
          method: 'eth_chainId',
        },
        {
          timeout: 5000,
        }
      );
      if (+data.result !== +chain.id) {
        return {
          error: {
            key: 'rpcUrl',
            message: 'Invalid RPC',
          },
        };
      }
    } catch (error) {
      return {
        error: {
          key: 'rpcUrl',
          message: 'Invalid RPC',
        },
      };
    }

    this.store.customTestnet = {
      ...this.store.customTestnet,
      [chain.id]: createTestnetChain(chain),
    };
    this.chains[chain.id] = createClientByChain(chain);
    updateChainStore({
      testnetList: Object.values(this.store.customTestnet),
    });
    console.log('update chain store');
    return this.store.customTestnet[chain.id];
  };

  remove = (chainId: number) => {
    this.store.customTestnet = omit(this.store.customTestnet, chainId);
    delete this.chains[chainId];
    updateChainStore({
      testnetList: Object.values(this.store.customTestnet),
    });
  };

  getClient = (chainId: number) => {
    return this.chains[chainId];
  };

  getList = () => {
    const list = Object.values(this.store.customTestnet).map((item) => {
      return createTestnetChain(item);
    });

    return list;
  };

  getTransactionCount = ({
    address,
    blockTag,
    chainId,
  }: {
    address: string;
    blockTag: 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized';
    chainId: number;
  }) => {
    const client = this.getClient(+chainId);
    if (!client) {
      throw new Error(`Invalid chainId: ${chainId}`);
    }
    return getTransactionCount(client, {
      address: address as any,
      blockTag,
    });
  };

  estimateGas = async ({
    address,
    tx,
    chainId,
  }: {
    address: string;
    tx: Tx;
    chainId: number;
  }) => {
    const client = this.getClient(+chainId);
    if (!client) {
      throw new Error(`Invalid chainId: ${chainId}`);
    }
    const res = await estimateGas(client, {
      account: address as any,
      ...tx,
    } as any);
    return res.toString();
  };

  getGasPrice = async (chainId: number) => {
    const client = this.getClient(+chainId);
    if (!client) {
      throw new Error(`Invalid chainId: ${chainId}`);
    }
    const res = await getGasPrice(client);
    return res.toString();
  };

  getGasMarket = async (chainId: number) => {
    // const SETTINGS_BY_PRIORITY_LEVEL = {
    //   low: {
    //     percentile: 10 as Percentile,
    //     baseFeePercentageMultiplier: new BN(110),
    //     priorityFeePercentageMultiplier: new BN(94),
    //     minSuggestedMaxPriorityFeePerGas: new BN(1_000_000_000),
    //     estimatedWaitTimes: {
    //       minWaitTimeEstimate: 15_000,
    //       maxWaitTimeEstimate: 30_000,
    //     },
    //   },
    //   medium: {
    //     percentile: 20 as Percentile,
    //     baseFeePercentageMultiplier: new BN(120),
    //     priorityFeePercentageMultiplier: new BN(97),
    //     minSuggestedMaxPriorityFeePerGas: new BN(1_500_000_000),
    //     estimatedWaitTimes: {
    //       minWaitTimeEstimate: 15_000,
    //       maxWaitTimeEstimate: 45_000,
    //     },
    //   },
    //   high: {
    //     percentile: 30 as Percentile,
    //     baseFeePercentageMultiplier: new BN(125),
    //     priorityFeePercentageMultiplier: new BN(98),
    //     minSuggestedMaxPriorityFeePerGas: new BN(2_000_000_000),
    //     estimatedWaitTimes: {
    //       minWaitTimeEstimate: 15_000,
    //       maxWaitTimeEstimate: 60_000,
    //     },
    //   },
    // };

    const gasPrice = await this.getGasPrice(chainId);

    const levels = [
      {
        level: 'slow',
        baseFeePercentageMultiplier: 110,
        priorityFeePercentageMultiplier: 94,
      },
      {
        level: 'normal',
        baseFeePercentageMultiplier: 120,
        priorityFeePercentageMultiplier: 97,
      },
      {
        level: 'fast',
        baseFeePercentageMultiplier: 125,
        priorityFeePercentageMultiplier: 98,
      },
    ];

    return levels
      .map((item) => {
        return {
          level: item.level,
          price: new BigNumber(gasPrice)
            .multipliedBy(item.baseFeePercentageMultiplier)
            .div(100)
            .toNumber(),
          priority_price: new BigNumber(gasPrice)
            .multipliedBy(item.priorityFeePercentageMultiplier)
            .div(100)
            .toNumber(),
          front_tx_count: 0,
          estimated_seconds: 0,
        };
      })
      .concat([
        {
          level: 'custom',
          price: 0,
          front_tx_count: 0,
          estimated_seconds: 0,
          priority_price: 0,
        },
      ]) as GasLevel[];
  };

  getToken = async ({
    chainId,
    address,
    tokenId,
  }: {
    chainId: number;
    address: string;
    tokenId?: string;
  }) => {
    const client = this.getClient(+chainId);
    if (!client) {
      throw new Error(`Invalid chainId: ${chainId}`);
    }
    if (!tokenId) {
      const balance = await getBalance(client, {
        address: address as any,
      });
      return formatEther(balance);
    }
  };
}

export const customTestnetService = new CustomTestnetService();

const createClientByChain = (chain: TestnetChainBase) => {
  return createClient({
    chain: defineChain({
      id: chain.id,
      name: chain.name,
      nativeCurrency: {
        symbol: chain.nativeTokenSymbol,
        name: chain.nativeTokenSymbol,
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: [chain.rpcUrl],
        },
      },
    }),
    transport: http(chain.rpcUrl),
  });
};

export const createTestnetChain = (chain: TestnetChainBase): TestnetChain => {
  return {
    ...chain,
    id: +chain.id,
    hex: intToHex(+chain.id),
    network: '' + chain.id,
    enum: `CUSTOM_${chain.id}` as CHAINS_ENUM,
    serverId: `custom_${chain.id}`,
    nativeTokenAddress: `custom_${chain.id}`,
    nativeTokenDecimals: 18,
    nativeTokenLogo: '',
    scanLink: chain.scanLink || '',
    logo: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='16' fill='%236A7587'></circle><text x='16' y='17' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='12' font-weight='400'>${encodeURIComponent(
      chain.name.substring(0, 3)
    )}</text></svg>`,
    eip: {
      1559: false,
    },
    isTestnet: true,
  };
};
