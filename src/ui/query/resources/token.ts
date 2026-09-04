import { queryOptions } from '@tanstack/react-query';
import type { WalletControllerType } from '@/ui/utils/WalletContext';
import { createQueryKey } from '../queryKey';

export type TokenQueryParams = {
  address?: string;
  chainServerId?: string;
  tokenId?: string;
};

export const tokenQueryKey = ({
  address,
  chainServerId,
  tokenId,
}: TokenQueryParams) =>
  createQueryKey(
    'token',
    {
      address,
      chainId: chainServerId,
    },
    {
      tokenId: tokenId ?? null,
    }
  );

export const tokenQueryOptions = (
  wallet: WalletControllerType,
  { address, chainServerId, tokenId }: TokenQueryParams
) =>
  queryOptions({
    queryKey: tokenQueryKey({ address, chainServerId, tokenId }),
    queryFn: () => {
      if (!address || !chainServerId || !tokenId) {
        throw new Error(
          'Token query requires address, chainServerId and tokenId'
        );
      }
      return wallet.openapi.getToken(address, chainServerId, tokenId);
    },
    enabled: Boolean(address && chainServerId && tokenId),
    staleTime: 10_000,
  });
