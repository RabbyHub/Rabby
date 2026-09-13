export type QueryScope = {
  address?: string | null;
  chainId?: string | number | null;
  isTestnet?: boolean | null;
  currency?: string | null;
};

const normalizeQueryScope = ({
  address,
  chainId,
  isTestnet,
  currency,
}: QueryScope) => ({
  address: address?.toLowerCase() ?? null,
  chainId: chainId ?? null,
  isTestnet: isTestnet ?? null,
  currency: currency?.toUpperCase() ?? null,
});

/**
 * Shared key shape for Rabby server resources.
 *
 * A resource must pass every account, network, environment, and currency value
 * that can change its response. The normalized scope prevents checksummed EVM
 * addresses from creating duplicate cache entries.
 */
export const createQueryKey = <
  TParams extends Record<string, unknown> = Record<string, never>
>(
  resourceName: string,
  scope: QueryScope = {},
  params?: TParams
) => ['rabby', resourceName, normalizeQueryScope(scope), params ?? {}] as const;
