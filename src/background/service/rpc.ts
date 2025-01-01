import { CHAINS_ENUM } from '@debank/common';
import { createPersistStore } from 'background/utils';
import { findChainByEnum } from '@/utils/chain';
import { http } from '../utils/http';

export interface RPCItem {
  url: string;
  enable: boolean;
}

export type RPCServiceStore = {
  customRPC: Record<string, RPCItem>;
};

const MAX = 4_294_967_295;
let idCounter = Math.floor(Math.random() * MAX);

function getUniqueId(): number {
  idCounter = (idCounter + 1) % MAX;
  return idCounter;
}

class RPCService {
  store: RPCServiceStore = {
    customRPC: {},
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
