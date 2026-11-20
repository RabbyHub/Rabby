import { useQuery } from '@tanstack/react-query';
import { tokenQueryOptions } from '@/ui/query/resources/token';

export const useTokenInfo = (
  params: {
    address?: string;
    chainServerId?: string;
    tokenId?: string;
  },
  options?: { ready?: boolean }
) => {
  const { address, chainServerId, tokenId } = params;
  const { data } = useQuery({
    ...tokenQueryOptions(params),
    enabled:
      options?.ready !== false && Boolean(address && chainServerId && tokenId),
  });
  return data;
};
