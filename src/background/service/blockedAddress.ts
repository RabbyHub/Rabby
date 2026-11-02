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
  // Same as SignTx, a failed lookup lets that address through. Handled per
  // address so it never hides another address already known to be blocked.
  const res = await Promise.all(
    unique.map((address) => isBlockedAddress(address).catch(() => false))
  );
  return res.some(Boolean);
};

// selector => indexes of the address args that send or receive the asset.
// approve / setApprovalForAll are left out on purpose: revoking is
// approve(spender, 0), and a blocked spender must stay revokable.
const TRANSFER_ADDRESS_ARGS: Record<string, number[]> = {
  '0xa9059cbb': [0], // transfer(address,uint256)
  '0x23b872dd': [0, 1], // transferFrom(address,address,uint256)
  '0x42842e0e': [0, 1], // safeTransferFrom(address,address,uint256)
  '0xb88d4fde': [0, 1], // safeTransferFrom(address,address,uint256,bytes)
  '0xf242432a': [0, 1], // safeTransferFrom(address,address,uint256,uint256,bytes)
  '0x2eb2c2d6': [0, 1], // safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)
};

// tx from/to plus the token / NFT receiver, which sits in calldata where a
// from/to check never sees it (e.g. a dapp-initiated ERC-20 transfer).
export const getTxAddressesToCheck = (tx: {
  from?: string;
  to?: string;
  data?: string;
}) => {
  const data = typeof tx.data === 'string' ? tx.data.toLowerCase() : '';
  const args = TRANSFER_ADDRESS_ARGS[data.slice(0, 10)] || [];
  return [
    tx.from,
    tx.to,
    // Static address args: the last 20 bytes of each 32-byte head word.
    ...args
      .map((i) => data.slice(10 + 64 * i + 24, 10 + 64 * (i + 1)))
      .filter((addr) => addr.length === 40)
      .map((addr) => `0x${addr}`),
  ];
};

export const clearBlockedAddressCache = () => cache.reset();
