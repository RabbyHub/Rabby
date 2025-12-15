import { useWallet } from '@/ui/utils';
import { useRequest } from 'ahooks';

export const useNFTTradingConfig = () => {
  const wallet = useWallet();
  const { data } = useRequest(
    async () => {
      return await wallet.openapi.getNFTTradingConfig();
    },
    {
      cacheKey: 'nft-trading-config',
      cacheTime: 30 * 60 * 1000,
      staleTime: 30 * 60 * 1000,
    }
  );
  return data;
};
