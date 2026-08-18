import { CHAINS_ENUM } from '@debank/common';
import { createPersistStore, patchPersistStore } from 'background/utils';
import { findChainByEnum } from '@/utils/chain';
import { http } from '../utils/http';
import openapiService, { DefaultRPCRes } from './openapi';
import { CUSTOM_RPC_ENABLED, INTERNAL_REQUEST_ORIGIN } from '@/constant';
import { z } from 'zod';

export interface RPCItem {
  url: string;
  enable: boolean;
}

type RPCDefaultItem = DefaultRPCRes['rpcs'][number];

const rpcItemSchema = z.object({
  url: z.string(),
  enable: z.boolean(),
});

const rpcDefaultItemSchema = z.object({
  chainId: z.string(),
  rpcUrl: z.array(z.string()),
  txPushToRPC: z.boolean(),
});

export const rpcServiceStoreSchema = z.object({
  customRPC: z.record(z.string(), rpcItemSchema).default(() => ({})),
  defaultRPC: z.record(z.string(), rpcDefaultItemSchema).optional(),
});

export type RPCServiceStore = z.output<typeof rpcServiceStoreSchema>;

export type CustomRPCServiceStore = Pick<RPCServiceStore, 'customRPC'>;

const createRPCServiceStoreTemplate = (): RPCServiceStore =>
  rpcServiceStoreSchema.parse({});

export const BE_SUPPORTED_METHODS: string[] = [
  'eth_call',
  'eth_blockNumber',
  'eth_getBalance',
  'eth_getCode',
  'eth_getStorageAt',
  'eth_getTransactionCount',
  'eth_chainId',
];

async function submitTxWithFallbackRpcs<T>(
  rpcUrls: string[],
  fn: (rpc: string) => Promise<T>
): Promise<[T, string]> {
  return new Promise((resolve, reject) => {
    let errorCount = 0;
    rpcUrls.forEach((url) => {
      fn(url)
        .then((result) => {
          resolve([result, url]);
        })
        .catch((err) => {
          errorCount++;
          if (errorCount === rpcUrls.length) {
            reject(err);
          }
        });
    });
  });
}

async function callWithFallbackRpcs<T>(
  rpcUrls: string[],
  fn: (rpc: string) => Promise<T>
): Promise<T> {
  let error;
  for (const url of rpcUrls) {
    try {
      const result = await fn(url);
      return result;
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
  return data.rpcs as RPCDefaultItem[];
};

class RPCService {
  store: RPCServiceStore = createRPCServiceStoreTemplate();
  preferredRPC: Record<string, string> = {};
  rpcProbeTasks: Partial<Record<string, Promise<void>>> = {};
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
      template: createRPCServiceStoreTemplate(),
      schema: rpcServiceStoreSchema,
    });
    this.store = storage || this.store;

    {
      // remove unsupported chain
      const customRPC = Object.fromEntries(
        Object.entries(this.store.customRPC).filter(([chainEnum]) =>
          findChainByEnum(chainEnum)
        )
      );

      if (
        Object.keys(customRPC).length !==
        Object.keys(this.store.customRPC).length
      ) {
        this.patchStore({ customRPC });
      }
    }
  };

  getCustomRPCStore = (): CustomRPCServiceStore => ({
    customRPC: this.getAllRPC(),
  });

  patchStore = (partials: Partial<RPCServiceStore>) => {
    const previousCustomRPC = this.store.customRPC;
    patchPersistStore(this.store, partials);

    if (!Object.prototype.hasOwnProperty.call(partials, 'customRPC')) {
      return [];
    }

    const changedChains = Object.keys({
      ...previousCustomRPC,
      ...this.store.customRPC,
    }).filter((chain) => {
      const previous = previousCustomRPC[chain];
      const current = this.store.customRPC[chain];
      return (
        previous?.url !== current?.url || previous?.enable !== current?.enable
      );
    }) as CHAINS_ENUM[];

    changedChains.forEach((chain) => {
      if (this.rpcStatus[chain]) {
        delete this.rpcStatus[chain];
      }
    });

    return changedChains;
  };

  syncDefaultRPC = async () => {
    try {
      // TODO: remove  after test
      const data = process.env.DEBUG
        ? await fetchDefaultRpc()
        : (await openapiService.getDefaultRPCs())?.rpcs;

      if (data.length) {
        const defaultRPC: Record<string, RPCDefaultItem> = data?.reduce(
          (acc, item) => {
            acc[item.chainId] = item;

            return acc;
          },
          {} as Record<string, RPCDefaultItem>
        );
        this.patchStore({ defaultRPC });
      }
    } catch (error) {
      console.error('Failed to fetch default RPC:', error);
    }
  };

  getDefaultRPCByChainServerId = (chainServerId: string) => {
    return this.store.defaultRPC?.[chainServerId];
  };

  probeBestRPC = (chainServerId: string) => {
    if (this.rpcProbeTasks[chainServerId]) {
      return this.rpcProbeTasks[chainServerId];
    }
    const hostList = this.store.defaultRPC?.[chainServerId]?.rpcUrl || [];
    if (hostList.length < 2) return Promise.resolve();

    const probe = Promise.allSettled(
      hostList.map(async (url) => ({
        url,
        blockNumber: BigInt(
          await this.defaultRPCRequest(url, 'eth_blockNumber', [])
        ),
      }))
    )
      .then((results) => {
        const bestRPC = results.reduce<
          { url: string; blockNumber: bigint } | undefined
        >((best, result) => {
          if (result.status === 'rejected') return best;
          return !best || result.value.blockNumber > best.blockNumber
            ? result.value
            : best;
        }, undefined);

        if (bestRPC) {
          this.preferredRPC[chainServerId] = bestRPC.url;
        }
      })
      .finally(() => {
        delete this.rpcProbeTasks[chainServerId];
      });

    this.rpcProbeTasks[chainServerId] = probe;
    return probe;
  };

  supportedRpcMethodByBE = (method?: string) => {
    return BE_SUPPORTED_METHODS.some((e) => e === method);
  };

  defaultRPCRequest = async (
    host: string,
    method: string,
    params: any[],
    timeout = 10000
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
    return data.result;
  };

  defaultRPCSubmitTxWithFallback = async (
    chainServerId: string,
    method: string,
    params: any[]
  ) => {
    const hostList = this?.store?.defaultRPC?.[chainServerId]?.rpcUrl || [];
    if (!hostList.length) {
      throw new Error(`No available rpc for ${chainServerId}`);
    }
    return submitTxWithFallbackRpcs(hostList, (rpc) =>
      this.defaultRPCRequest(rpc, method, params)
    );
  };

  requestDefaultRPC = async ({
    chainServerId,
    method,
    params,
    origin = INTERNAL_REQUEST_ORIGIN,
  }: {
    chainServerId: string;
    method: string;
    params: any;
    origin?: string;
  }) => {
    const rpcUrls = this.store.defaultRPC?.[chainServerId]?.rpcUrl || [];
    const preferredRPC = this.preferredRPC[chainServerId];
    const hostList =
      method !== 'eth_sendRawTransaction' &&
      preferredRPC &&
      rpcUrls.includes(preferredRPC)
        ? [preferredRPC, ...rpcUrls.filter((url) => url !== preferredRPC)]
        : rpcUrls;
    const isBESupported = this.supportedRpcMethodByBE(method);

    if (!hostList.length || isBESupported) {
      // throw new Error(`No available rpc for ${chainServerId}`);
      return openapiService.ethRpc(chainServerId, {
        origin: encodeURIComponent(origin),
        method,
        params,
      });
    }
    // return callWithFallbackRpcs(hostList, (rpc) =>
    //   this.request(rpc, method, params)
    // );
    return callWithFallbackRpcs(hostList, (rpc) =>
      this.defaultRPCRequest(rpc, method, params)
    );
  };

  getDefaultRPC = (chainServerId: string) => {
    return this.store.defaultRPC?.[chainServerId];
  };

  hasCustomRPC = (chain: CHAINS_ENUM) => {
    return (
      CUSTOM_RPC_ENABLED &&
      this.store.customRPC[chain] &&
      this.store.customRPC[chain].enable
    );
  };

  getRPCByChain = (chain: CHAINS_ENUM): RPCItem | undefined => {
    return CUSTOM_RPC_ENABLED ? this.store.customRPC[chain] : undefined;
  };

  getAllRPC = (): Record<string, RPCItem> => {
    return CUSTOM_RPC_ENABLED ? this.store.customRPC : {};
  };

  setRPC = (chain: CHAINS_ENUM, url: string) => {
    if (!CUSTOM_RPC_ENABLED) return;
    const rpcItem = this.store.customRPC[chain]
      ? {
          ...this.store.customRPC[chain],
          url,
        }
      : {
          url,
          enable: true,
        };
    this.patchStore({
      customRPC: {
        ...this.store.customRPC,
        [chain]: rpcItem,
      },
    });
  };

  setRPCEnable = (chain: CHAINS_ENUM, enable: boolean) => {
    if (!CUSTOM_RPC_ENABLED) return;
    this.patchStore({
      customRPC: {
        ...this.store.customRPC,
        [chain]: {
          ...this.store.customRPC[chain],
          enable,
        },
      },
    });
  };

  removeCustomRPC = (chain: CHAINS_ENUM) => {
    if (!CUSTOM_RPC_ENABLED) return;
    const customRPC = { ...this.store.customRPC };
    delete customRPC[chain];
    this.patchStore({ customRPC });
  };

  requestCustomRPC = async (
    chain: CHAINS_ENUM,
    method: string,
    params: any[]
  ) => {
    if (!CUSTOM_RPC_ENABLED) {
      throw new Error('Custom RPC is disabled');
    }
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
    timeout = 10000
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
    if (!CUSTOM_RPC_ENABLED) return false;
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
