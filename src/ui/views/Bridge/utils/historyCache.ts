import type { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import type { WalletControllerType } from '@/ui/utils/WalletContext';
import { isEqual } from 'lodash';

const TOP_HISTORY_LIMIT = 10;
type HistoryResponse = Awaited<
  ReturnType<WalletControllerType['openapi']['getBridgeHistoryList']>
>;

type HistoryCache = {
  list: BridgeHistory[];
  request?: Promise<HistoryResponse>;
};

// 按地址共享，切页保留，关闭页面释放。
const caches = new Map<string, HistoryCache>();
const getCache = (address: string) => {
  const key = address.toLowerCase();
  let cache = caches.get(key);
  if (!cache) {
    cache = { list: [] };
    caches.set(key, cache);
  }
  return cache;
};

export const getBridgeHistoryTop10 = (address: string) =>
  getCache(address).list;

/** 复用进行中的请求；完整第一页刷新 top 10。 */
export const refreshBridgeHistoryTop10 = (
  wallet: WalletControllerType,
  address: string
): Promise<HistoryResponse> => {
  const cache = getCache(address);
  if (cache.request) return cache.request;

  cache.request = wallet.openapi
    .getBridgeHistoryList({
      user_addr: address,
      start: 0,
      limit: TOP_HISTORY_LIMIT,
      is_all: true,
    })
    .then((response) => {
      if (response.history_list) {
        const list = response.history_list.slice(0, TOP_HISTORY_LIMIT);
        if (!isEqual(cache.list, list)) {
          cache.list = list;
        }
      }
      return response;
    })
    .finally(() => {
      cache.request = undefined;
    });
  return cache.request;
};
