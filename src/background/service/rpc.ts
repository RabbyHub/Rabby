import { CHAINS_ENUM } from '@debank/common';
import { createPersistStore } from 'background/utils';
import axios from 'axios';

export type RPCServiceStore = {
  customRPC: Record<string, string>;
  rpcStatus: Record<
    string,
    {
      expireAt: number;
      available: boolean;
    }
  >;
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
    rpcStatus: {},
  };

  init = async () => {
    const storage = await createPersistStore<RPCServiceStore>({
      name: 'rpc',
      template: {
        customRPC: {},
        rpcStatus: {},
      },
    });
    this.store = storage || this.store;
    if (!this.store.rpcStatus) this.store.rpcStatus = {};
  };

  hasCustomRPC = (chain: CHAINS_ENUM) => {
    return !!this.store.customRPC[chain];
  };

  getRPCByChain = (chain: CHAINS_ENUM) => {
    return this.store.customRPC[chain];
  };

  getAllRPC = () => {
    return this.store.customRPC;
  };

  setRPC = (chain: CHAINS_ENUM, url: string) => {
    this.store.customRPC = {
      ...this.store.customRPC,
      [chain]: url,
    };
  };

  removeCustomRPC = (chain: CHAINS_ENUM) => {
    const map = this.store.customRPC;
    delete map[chain];
    this.store.customRPC = map;
  };

  requestCustomRPC = async (
    chain: CHAINS_ENUM,
    method: string,
    params: any[]
  ) => {
    const host = this.store.customRPC[chain];
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
    const { data } = await axios.post(
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
    if (this.store.rpcStatus[chain]?.expireAt > Date.now()) {
      return this.store.rpcStatus[chain].available;
    }
    const host = this.store.customRPC[chain];
    if (!host) return false;
    try {
      await this.request(host, 'eth_blockNumber', [], 2000);
      this.store.rpcStatus = {
        ...this.store.rpcStatus,
        [chain]: {
          expireAt: Date.now() + 60 * 1000,
          available: true,
        },
      };
      return true;
    } catch (e) {
      this.store.rpcStatus = {
        ...this.store.rpcStatus,
        [chain]: {
          expireAt: Date.now() + 60 * 1000,
          available: false,
        },
      };
      return false;
    }
  };
}

export default new RPCService();
