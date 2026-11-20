import { queryOptions } from '@tanstack/react-query';
import type { WalletControllerType } from '@/ui/utils/WalletContext';
import { wallet } from '@/ui/wallet';
import { createQueryKey } from './queryKey';
import type { QueryScope } from './queryKey';

type Openapi = WalletControllerType['openapi'];

/** Client configuration, not data reads. */
type OpenapiConfigMethod =
  | 'init'
  | 'initSync'
  | 'ethRpc'
  | 'setHost'
  | 'setHostSync'
  | 'getHost'
  | 'setTestnetHost'
  | 'getTestnetHost'
  | 'setAPIKey'
  | 'setAPITime'
  | 'removeAPIKey';

/**
 * OpenAPI methods that resolve to data. Methods resolving to `void` are
 * writes or setters and are excluded; writes that return data cannot be told
 * apart by type, so callers must only pass read methods.
 */
export type OpenapiReadMethod = Exclude<
  {
    [K in keyof Openapi]-?: Openapi[K] extends (
      ...args: any[]
    ) => Promise<infer R>
      ? [R] extends [void]
        ? never
        : K
      : never;
  }[keyof Openapi],
  OpenapiConfigMethod
> &
  string;

type OpenapiArgs<M extends OpenapiReadMethod> = Parameters<Openapi[M]>;
type OpenapiResult<M extends OpenapiReadMethod> = Awaited<
  ReturnType<Openapi[M]>
>;

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/**
 * Lower-cases EVM addresses anywhere in the arguments, so a checksummed and a
 * lower-case address share one cache entry. Used for the key only; the request
 * still receives the original arguments.
 */
const normalizeKeyArgs = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return EVM_ADDRESS.test(value) ? value.toLowerCase() : value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeKeyArgs);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeKeyArgs(item)])
    );
  }
  return value;
};

export const openapiQueryKey = <M extends OpenapiReadMethod>(
  method: M,
  args: OpenapiArgs<M>,
  scope: QueryScope = {}
) =>
  createQueryKey('openapi', scope, {
    method,
    args: normalizeKeyArgs(args) as OpenapiArgs<M>,
  });

/**
 * Query options for one OpenAPI read, keyed by its method and arguments.
 *
 * - `queryFn` returns the raw response, so every caller of the same method and
 *   arguments shares one cache entry. Shape the data with `select`.
 * - Pass `scope` (address, chain) when the cache must be invalidated per
 *   account or chain; positional arguments cannot be matched by name.
 * - The OpenAPI host is not part of the key. `['rabby', 'openapi']` matches
 *   every entry if the host changes.
 * - Only for HTTP reads. Wallet controller methods depend on background state
 *   (custom RPC, testnet) and need their own resource.
 */
export const openapiQueryOptions = <M extends OpenapiReadMethod>(
  method: M,
  args: OpenapiArgs<M>,
  scope: QueryScope = {}
) =>
  queryOptions({
    queryKey: openapiQueryKey(method, args, scope),
    queryFn: () =>
      ((wallet.openapi as unknown) as Record<
        M,
        (...params: OpenapiArgs<M>) => Promise<OpenapiResult<M>>
      >)[method](...args),
  });
