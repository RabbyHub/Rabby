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
  address?: string;
  q?: string;
  chainId?: number;
  withBalance: boolean;
  enabled?: boolean;
}) => {
  const wallet = useWallet();

  const { data: hasData } = useRequest(
    async () => {
      if (!address) {
        return false;
      }
      let allList = await wallet.getCustomTestnetTokenList({
        address,
      });
      if (withBalance) {
        allList = allList.filter((item) => item.amount > 0);
      }
      return allList.length > 0;
    },
    {
      refreshDeps: [address, withBalance],
    }
  );
  const { data = [], loading } = useRequest(
    async () => {
      if (!enabled || !address) {
        return [];
      }
      let res = await wallet.getCustomTestnetTokenList({
        address,
        chainId,
        q,
      });
      if (withBalance) {
        res = res.filter((item) => item.amount > 0);
      }
      return res.map((item) => customTestnetTokenToTokenItem(item));
    },
    {
      refreshDeps: [address, chainId, enabled, withBalance, q],
    }
  );

  return {
    testnetTokenList: data,
    loading,
    hasData,
  };
};
