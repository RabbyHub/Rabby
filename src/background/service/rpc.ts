import { CHAINS_ENUM } from '@debank/common';
import { createPersistStore } from 'background/utils';
import { findChainByEnum } from '@/utils/chain';
import { http } from '../utils/http';
import openapiService, { DefaultRPCRes } from './openapi';

export interface RPCItem {
  url: string;
  enable: boolean;
}

type RPCDefaultItem = DefaultRPCRes['stats'][number];

export type RPCServiceStore = {
  customRPC: Record<string, RPCItem>;
  defaultRPC?: Record<string, RPCDefaultItem>;
};

export const BE_SUPPORTED_METHODS: string[] = [
  'eth_call',
  'eth_blockNumber',
  'eth_getBalance',
  'eth_getCode',
  'eth_getStorageAt',
  'eth_getTransactionCount',
  'eth_chainId',
];

async function callWithFallbackRpcs<T>(
  rpcUrls: string[],
  fn: (rpc: string) => Promise<T>
): Promise<[T, string]> {
  let error;
  for (const url of rpcUrls) {
    try {
      const result = await fn(url);
      return [result, url];
    } catch (err) {
      if (!error) {
        error = err;
      }
      console.warn(`RPC failed: ${url}`, err);
    }
  }
  throw error;
}

const MAX = 4_294_967_295;
let idCounter = Math.floor(Math.random() * MAX);

function getUniqueId(): number {
  idCounter = (idCounter + 1) % MAX;
  return idCounter;
}

// TODO: remove
const fetchDefaultRpc = async () => {
  const { data } = await http.get('https://api.rabby.io/v1/chainrpc');
  return data.stats as RPCDefaultItem[];
};

class RPCService {
  store: RPCServiceStore = {
    customRPC: {},
    defaultRPC: {},
  };
  rpcStatus: Record<
    string,
    {
      expireAt: number;
      available: boolean;
    }
  > = {};
  init = async () => {
    const storage = await createPersistStore<RPCServiceStore>({
      name: 'rpc',
      template: {
        customRPC: {},
        defaultRPC: {},
      },
    });
    this.store = storage || this.store;

    {
      // remove unsupported chain
      let changed = false;
      Object.keys({ ...this.store.customRPC }).forEach((chainEnum) => {
        if (!findChainByEnum(chainEnum)) {
          changed = true;
          delete this.store.customRPC[chainEnum];
        }
      });

      if (changed) {
        this.store.customRPC = { ...this.store.customRPC };
      }
    }

    this.syncDefaultRPC();
  };

  syncDefaultRPC = async () => {
    try {
      // const data = (await openapiService.getDefaultRPCs())?.stats;

      // TODO: remove  after test
      const data = await fetchDefaultRpc();
      const defaultRPC: Record<string, RPCDefaultItem> = data?.reduce(
        (acc, item) => {
          acc[item.chainId] = item;
          return acc;
        },
        {} as Record<string, RPCDefaultItem>
      );
      this.store.defaultRPC = defaultRPC;
    } catch (error) {
      console.error('Failed to fetch default RPC:', error);
    }
  };

  getDefaultRPCByChainServerId = (chainServerId: string) => {
    return this.store.defaultRPC?.[chainServerId];
  };

  supportedRpcMethodByBE = (method?: string) => {
    return BE_SUPPORTED_METHODS.some((e) => e === method);
  };

  requestDefaultRPCWithFallback = async (
    chainServerId: string,
    method: string,
    params: any[]
  ) => {
    const hostList = this?.store?.defaultRPC?.[chainServerId]?.rpcUrl || [];
    if (!hostList.length) {
      throw new Error(`No available rpc for ${chainServerId}`);
    }
    return callWithFallbackRpcs(hostList, (rpc) =>
      this.request(rpc, method, params)
    );
  };

  requestDefaultRPC = async (
    chainServerId: string,
    method: string,
    params: any[]
  ) => {
    const hostList = this?.store?.defaultRPC?.[chainServerId]?.rpcUrl || [];
    if (!hostList.length) {
      throw new Error(`No available rpc for ${chainServerId}`);
    }
    // return callWithFallbackRpcs(hostList, (rpc) =>
    //   this.request(rpc, method, params)
    // );
    return this.request(hostList[0], method, params);
  };

  getDefaultRPC = (chainServerId: string) => {
    return this.store.defaultRPC?.[chainServerId];
  };

  hasCustomRPC = (chain: CHAINS_ENUM) => {
    return this.store.customRPC[chain] && this.store.customRPC[chain].enable;
  };

  getRPCByChain = (chain: CHAINS_ENUM) => {
    return this.store.customRPC[chain];
  };

  getAllRPC = () => {
    return this.store.customRPC;
  };

  setRPC = (chain: CHAINS_ENUM, url: string) => {
    const rpcItem = this.store.customRPC[chain]
      ? {
          ...this.store.customRPC[chain],
          url,
        }
      : {
          url,
          enable: true,
        };
    this.store.customRPC = {
      ...this.store.customRPC,
      [chain]: rpcItem,
    };
    if (this.rpcStatus[chain]) {
      delete this.rpcStatus[chain];
    }
  };

  setRPCEnable = (chain: CHAINS_ENUM, enable: boolean) => {
    this.store.customRPC = {
      ...this.store.customRPC,
      [chain]: {
        ...this.store.customRPC[chain],
        enable,
      },
    };
  };

  removeCustomRPC = (chain: CHAINS_ENUM) => {
    const map = this.store.customRPC;
    delete map[chain];
    this.store.customRPC = map;
    if (this.rpcStatus[chain]) {
      delete this.rpcStatus[chain];
    }
  };

  requestCustomRPC = async (
    chain: CHAINS_ENUM,
    method: string,
    params: any[]
  ) => {
    const host = this.store.customRPC[chain]?.url;
    if (!host) {
      throw new Error(`No customRPC set for ${chain}`);
    }
    return this.request(host, method, params);
  };

  request = async (
    host: string,
    method: string,
    params: any[],
    timeout = 5000
  ) => {
    const { data } = await http.post(
      host,
      {
        jsonrpc: '2.0',
        id: getUniqueId(),
        params,
        method,
      },
      {
        timeout,
      }
    );
    if (data?.error) throw data.error;
    if (data?.result) return data.result;
    return data;
  };

  ping = async (chain: CHAINS_ENUM) => {
    if (this.rpcStatus[chain]?.expireAt > Date.now()) {
      return this.rpcStatus[chain].available;
    }
    const host = this.store.customRPC[chain]?.url;
    if (!host) return false;
    try {
      await this.request(host, 'eth_blockNumber', [], 2000);
      this.rpcStatus = {
        ...this.rpcStatus,
        [chain]: {
          ...this.rpcStatus[chain],
          expireAt: Date.now() + 60 * 1000,
          available: true,
        },
      };
      return true;
    } catch (e) {
      this.rpcStatus = {
        ...this.rpcStatus,
        [chain]: {
          ...this.rpcStatus[chain],
          expireAt: Date.now() + 60 * 1000,
          available: false,
        },
      };
      return false;
    }
  };
}

export default new RPCService();
