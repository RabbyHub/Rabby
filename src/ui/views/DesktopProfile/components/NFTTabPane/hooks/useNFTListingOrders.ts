import { useWallet } from '@/ui/utils';
import { useRequest } from 'ahooks';

export const useNFTListingOrders = (params: {
  maker?: string;
  chain_id?: string;
  collection_id?: string;
  inner_id?: string;
  limit?: number;
  cursor?: string;
}) => {
  const wallet = useWallet();
  const { maker, chain_id, collection_id, inner_id, limit, cursor } = params;
  return useRequest(
    async () => {
      if (!maker || !chain_id || !collection_id || !inner_id) {
        // throw new Error('invalid params');
        return;
      }
      return await wallet.openapi.getNFTListingOrders({
        maker,
        chain_id,
        collection_id,
        inner_id,
        limit,
        cursor,
      });
    },
    {
      // cacheKey: `${maker}-${chain_id}-${collection_id}-${limit}-${cursor}`,
      refreshDeps: [maker, chain_id, collection_id, inner_id, limit, cursor],
    }
  );
};
