import { CHAINS_ENUM } from '@debank/common';
import { createPersistStore } from 'background/utils';
import axios from 'axios';
import { findChainByEnum, findChainByID, isTestnet } from '@/utils/chain';
import { defineChain, createClient, Client, http, toHex } from 'viem';
import { omit } from 'lodash';

export interface TestnetChainBase {
  id: number;
  name: string;
  nativeTokenSymbol: string;
  nativeTokenAddress: string;
  rpcUrl: string;
  scanLink?: string;
}

export interface TestnetChain extends TestnetChainBase {
  hex: string;
  enum: CHAINS_ENUM;
}

export interface RPCItem {
  url: string;
  enable: boolean;
}

export type CutsomTestnetServiceStore = {
  customTestnet: Record<string, TestnetChain>;
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
  };

  chains: Record<string, Client> = {};

  init = async () => {
    const storage = await createPersistStore<CutsomTestnetServiceStore>({
      name: 'customTestnet',
      template: {
        customTestnet: {},
      },
    });
    this.store = storage || this.store;
    Object.values(this.store.customTestnet).forEach((chain) => {
      const client = createClientByChain(chain);
      this.chains[chain.id] = client;
    });
  };
  add = async (chain: TestnetChainBase) => {
    // if (findChainByID(+chain.id)) {
    //   throw new Error('Chain already supported by Rabby Wallet');
    // }

    // if (this.store.customTestnet[chain.id]) {
    //   throw new Error("You've already added this chain");
    // }

    try {
      const chainId = await axios.post(
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
      console.log({ chainId });
      // eslint-disable-next-line no-empty
    } catch (error) {}

    this.store.customTestnet = {
      ...this.store.customTestnet,
      [chain.id]: chain,
    };
    this.chains[chain.id] = createClientByChain(chain);
  };

  update = (chain: TestnetChainBase) => {
    // todo
    this.store.customTestnet = {
      ...this.store.customTestnet,
      [chain.id]: chain,
    };
    this.chains[chain.id] = createClientByChain(chain);
  };

  remove = (chainId: number) => {
    this.store.customTestnet = omit(this.store.customTestnet, chainId);
    delete this.chains[chainId];
  };

  getClient = (chainId: number) => {
    return this.chains[chainId];
  };

  getList = () => {
    const list = Object.values(this.store.customTestnet).map((item) => {
      return {
        ...item,
        hex: toHex(item.id),
        network: '' + item.id,
        enum: `CUSTOM_${item.id}`,
        serverId: `custom_${item.id}`,
        isTestnet: true,
      };
    });
    return list;
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
