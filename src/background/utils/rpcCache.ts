import { getChainList, getMainnetChainList } from '@/utils/chain';
import { isManifestV3 } from '@/utils/env';
import { CHAINS } from 'consts';
import browser from 'webextension-polyfill';
import { ALARMS_RPC_CACHE } from './alarms';
import { uniqueId } from 'lodash';

type CacheState = Map<
  string,
  { timeoutId: number; result: any; expireTime: number }
>;

class RpcCache {
  state: CacheState = new Map();
  latestBlockNumber: Record<string, string> = {};

  start() {
    this.loadBlockNumber();
    setInterval(() => {
      this.loadBlockNumber();
    }, 10000);
  }

  async loadBlockNumber() {
    const chainList = getChainList('mainnet');
    // currently use random number as blockNumber to reduce the heavy burdens of server
    this.latestBlockNumber = chainList.reduce((res, current) => {
      return {
        [current.serverId]: Math.floor(Math.random() * 10000),
        ...res,
      };
    }, {});
  }

  getLatestBlockNumber(chainId: string) {
    return this.latestBlockNumber[chainId] || Date.now().toString();
  }

  set(
    address: string,
    data: { method: string; chainId: string; params: any; result: any },
    expireTime = 150000
  ) {
    if (!this.canCache(data)) return;
    const latestBlockNumber = this.getLatestBlockNumber(data.chainId);
    const key = `${address}-${data.method}-${
      data.chainId
    }-${latestBlockNumber}-${JSON.stringify(data.params)}`;
    const cache = this.getIfExist(key);
    if (cache) {
      const { timeoutId } = this.state.get(key)!;
      clearTimeout(timeoutId);

      const id = (setTimeout(() => {
        this.state.delete(key);
      }, expireTime) as unknown) as number;

      this.state.set(key, {
        result: data.result,
        timeoutId: id,
        expireTime,
      });
    } else {
      const methodState: CacheState = new Map();
      const timeoutId = (setTimeout(() => {
        methodState.delete(key);
      }, expireTime) as unknown) as number;

      this.state.set(key, { result: data.result, timeoutId, expireTime });
    }
  }

  has(address: string, data: { method: string; params: any; chainId: string }) {
    const latestBlockNumber = this.getLatestBlockNumber(data.chainId);
    const key = `${address}-${data.method}-${
      data.chainId
    }-${latestBlockNumber}-${JSON.stringify(data.params)}`;
    const timeout = this.getIfExist(key);
    if (timeout !== null) {
      return true;
    }

    return false;
  }

  get(address: string, data: { method: string; params: any; chainId: string }) {
    const latestBlockNumber = this.getLatestBlockNumber(data.chainId);
    const key = `${address}-${data.method}-${
      data.chainId
    }-${latestBlockNumber}-${JSON.stringify(data.params)}`;
    const cache = this.getIfExist(key);
    return cache?.result;
  }

  updateExpire(
    address: string,
    data: { method: string; params: any; chainId: string },
    expireTime = 10000
  ) {
    const latestBlockNumber = this.getLatestBlockNumber(data.chainId);
    const key = `${address}-${data.method}-${
      data.chainId
    }-${latestBlockNumber}-${JSON.stringify(data.params)}`;
    const cache = this.getIfExist(key);
    if (cache) {
      const timeoutId = (setTimeout(() => {
        this.state.delete(key);
      }, expireTime) as unknown) as number;
      this.state.set(key, {
        timeoutId,
        result: cache.result,
        expireTime: cache.expireTime,
      });
    }
  }

  canCache(data: { method: string; params: any }) {
    switch (data.method) {
      case 'web3_clientVersion':
      case 'web3_sha3':
      case 'eth_protocolVersion':
      case 'eth_getBlockTransactionCountByHash':
      case 'eth_getUncleCountByBlockHash':
      case 'eth_getCode':
      case 'eth_getBlockByHash':
      case 'eth_getUncleByBlockHashAndIndex':
      case 'eth_getCompilers':
      case 'eth_compileLLL':
      case 'eth_compileSolidity':
      case 'eth_compileSerpent':
      case 'shh_version':
      case 'eth_getBlockByNumber':
      case 'eth_getBlockTransactionCountByNumber':
      case 'eth_getUncleCountByBlockNumber':
      case 'eth_getTransactionByBlockNumberAndIndex':
      case 'eth_getUncleByBlockNumberAndIndex':
      case 'eth_gasPrice':
      case 'eth_blockNumber':
      case 'eth_getStorageAt':
      case 'eth_call':
      case 'eth_estimateGas':
      case 'eth_getFilterLogs':
      case 'eth_getLogs':
        return true;

      default:
        return false;
    }
  }

  private getIfExist(key: string) {
    if (this.state.has(key)) return this.state.get(key);
    return null;
  }
}

export default new RpcCache();
