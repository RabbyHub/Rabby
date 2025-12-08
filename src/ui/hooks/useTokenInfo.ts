import { useRequest } from 'ahooks';
import { useWallet } from '../utils';

export const useTokenInfo = (
  params: {
    address?: string;
    chainServerId?: string;
    tokenId?: string;
  },
  options?: { ready?: boolean }
) => {
  const { address, chainServerId, tokenId } = params;
  const wallet = useWallet();
  const { data } = useRequest(
    async () => {
      if (!address || !chainServerId || !tokenId) {
        return;
      }
      return wallet.openapi.getToken(address, chainServerId, tokenId);
    },
    {
      refreshDeps: [address, chainServerId, tokenId],
      cacheKey: `${address}-${chainServerId}-${tokenId}`,
      staleTime: 10_000,
      ...options,
    }
  );
  return data;
};
