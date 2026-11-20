import PQueue from 'p-queue';
import type { WalletControllerType } from '@/ui/utils/WalletContext';

const CACHE_DURATION = 10 * 60 * 1000;
const CACHE_LIMIT = 200;

type BalanceApi = Pick<
  WalletControllerType['openapi'],
  'getTotalBalance' | 'getAppChainList'
>;

interface PendingBalance {
  controller: AbortController;
  subscribers: number;
  startedRequests: number;
  promise: Promise<number>;
}

const abortError = () => {
  const error = new Error('Address balance loading was canceled');
  error.name = 'AbortError';
  return error;
};

const waitForRateLimit = (delay: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delay);
    signal.addEventListener('abort', onAbort, { once: true });
  });

export const createAddressBalanceLoader = (openapi: BalanceApi) => {
  const queue = new PQueue({ concurrency: 2 });
  const requestTimes: number[] = [];
  const cache = new Map<string, { balance: number; expiresAt: number }>();
  const pending = new Map<string, PendingBalance>();

  const start = (address: string) => {
    const operation: PendingBalance = {
      controller: new AbortController(),
      subscribers: 0,
      startedRequests: 0,
      promise: Promise.resolve(0),
    };
    const { signal } = operation.controller;
    const enqueue = <T>(request: () => Promise<T>) =>
      queue.add(async () => {
        // The SDK cannot cancel an active request. Keep its queue slot until
        // it finishes, and only skip requests that have not started yet.
        while (!signal.aborted) {
          const now = Date.now();
          while (requestTimes.length && requestTimes[0] <= now - 1000) {
            requestTimes.shift();
          }
          if (requestTimes.length < 5) {
            requestTimes.push(now);
            operation.startedRequests++;
            return request();
          }
          // Count actual HTTP starts, so canceled rows neither consume rate
          // slots nor leave a long queue ahead of newly visible addresses.
          await waitForRateLimit(requestTimes[0] + 1000 - now, signal);
        }
        throw abortError();
      });

    operation.promise = Promise.resolve()
      .then(async () => {
        if (signal.aborted) throw abortError();
        const [evm, appChain] = await Promise.all([
          enqueue(() => openapi.getTotalBalance(address)),
          enqueue(() => openapi.getAppChainList(address)),
        ]);
        if (signal.aborted) throw abortError();

        let balance = evm.total_usd_value;
        for (const app of appChain.apps) {
          for (const item of app.portfolio_item_list || []) {
            balance += item.stats.net_usd_value;
          }
        }
        if (!Number.isFinite(balance)) {
          throw new Error('Invalid address balance response');
        }

        cache.set(address, {
          balance,
          expiresAt: Date.now() + CACHE_DURATION,
        });
        if (cache.size > CACHE_LIMIT) {
          cache.delete(cache.keys().next().value!);
        }
        return balance;
      })
      .catch((error) => {
        operation.controller.abort();
        throw error;
      })
      .finally(() => {
        if (pending.get(address) === operation) pending.delete(address);
      });
    pending.set(address, operation);
    return operation;
  };

  const load = (address: string, signal?: AbortSignal): Promise<number> => {
    if (signal?.aborted) return Promise.reject(abortError());

    const key = address.toLowerCase();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      cache.delete(key);
      cache.set(key, cached);
      return Promise.resolve(cached.balance);
    }
    cache.delete(key);

    const operation = pending.get(key) || start(key);
    operation.subscribers++;

    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (settle: () => void) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', onAbort);
        operation.subscribers--;
        // Once both public requests are active, retain their result for a
        // quick scroll back even when no row is currently awaiting it.
        if (
          !operation.subscribers &&
          operation.startedRequests < 2 &&
          pending.get(key) === operation
        ) {
          operation.controller.abort();
          pending.delete(key);
        }
        settle();
      };
      const onAbort = () => finish(() => reject(abortError()));

      signal?.addEventListener('abort', onAbort, { once: true });
      operation.promise.then(
        (balance) => finish(() => resolve(balance)),
        (error) => finish(() => reject(error))
      );
    });
  };

  return { load };
};
