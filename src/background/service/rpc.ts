import { CHAINS_ENUM } from '@debank/common';
import { createPersistStore } from 'background/utils';
import axios from 'axios';

export type RPCServiceStore = {
  customRPC: Record<string, string>;
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

  init = async () => {
    const storage = await createPersistStore<RPCServiceStore>({
      name: 'rpc',
      template: {
        customRPC: {},
      },
    });
    this.store = storage || this.store;
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
    timeout?: number
  ) => {
    const { data } = await axios.post(
      host,
      {
        jsonrpc: '2.0',
        id: getUniqueId(),
        params,
        method,
      },
      timeout ? { timeout } : undefined
    );
    if (data?.error) throw data.error;
    if (data?.result) return data.result;
    return data;
  };

  ping = async (host: string) => {
    // set ping request timeout as 5s
    await this.request(host, 'eth_blockNumber', [], 5000);
  };
}

export default new RPCService();
