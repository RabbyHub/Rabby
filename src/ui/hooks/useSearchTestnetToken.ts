import { useRequest } from 'ahooks';
import { useWallet } from '../utils/WalletContext';
import { customTestnetTokenToTokenItem } from '../utils/token';

export const useSearchTestnetToken = ({
  address,
  q,
  chainId,
  withBalance = false,
  enabled = false,
}: {
  address: string;
  q?: string;
  chainId?: number;
  withBalance: boolean;
  enabled?: boolean;
}) => {
  const wallet = useWallet();

  const { data = [], loading } = useRequest(
    async () => {
      if (!enabled) {
        return [];
      }
      let res = await wallet.getCustomTestnetTokenList({
        address,
        chainId,
      });
      if (withBalance) {
        res = res.filter((item) => item.amount > 0);
      }
      return res.map((item) => customTestnetTokenToTokenItem(item));
    },
    {
      refreshDeps: [address, chainId, enabled, withBalance],
    }
  );

  return {
    testnetTokenList: data,
    loading,
  };
};
