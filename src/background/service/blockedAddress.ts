import LRU from 'lru-cache';
import openapiService from './openapi';

// Shared by the UI checks and the sign-time check in ethSendTransaction, so one
// signing flow (and quote refreshes, batch txs) asks the API once per address.
// Holds the promise so concurrent checks of an address share one request.
const cache = new LRU<string, Promise<boolean>>({
  max: 500,
  maxAge: 5 * 60 * 1000,
});

const isBlockedAddress = (address: string) => {
  const key = address.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = openapiService
    .isBlockedAddress(key)
    .then((res) => !!res.is_blocked);
  cache.set(key, pending);
  // Never keep a failure: the next check must ask the API again.
  pending.catch(() => {
    if (cache.peek(key) === pending) cache.del(key);
  });
  return pending;
};

// Same rule as SignTx: neither sender nor receiver may be blocked.
export const hasBlockedAddress = async (addresses: unknown[]) => {
  const unique = [
    ...new Set(
      addresses
        .filter((addr): addr is string => typeof addr === 'string' && !!addr)
        .map((addr) => addr.toLowerCase())
    ),
  ];
  try {
    const res = await Promise.all(unique.map(isBlockedAddress));
    return res.some(Boolean);
  } catch (e) {
    // Same as SignTx: don't block signing when the check itself fails.
    return false;
  }
};

export const clearBlockedAddressCache = () => cache.reset();
