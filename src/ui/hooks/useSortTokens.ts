import { useEffect, useState } from 'react';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { AbstractPortfolioToken } from '../utils/portfolio/types';
import { useWallet } from 'ui/utils';
import { useRabbySelector } from 'ui/store';

const useSortToken = <T extends TokenItem | AbstractPortfolioToken>(
  list?: T[]
) => {
  const [result, setResult] = useState<T[]>([]);
  const wallet = useWallet();
  const currentAccount = useRabbySelector(
    (state) => state.account.currentAccount
  );

  const sortByChainBalance = async (list: T[]) => {
    if (currentAccount) {
      const cache = await wallet.getAddressCacheBalance(currentAccount.address);
      if (cache) {
        list.sort((a, b) => {
          const chain1 = cache.chain_list.find((chain) => chain.id === a.chain);
          const chain2 = cache.chain_list.find((chain) => chain.id === b.chain);
          if (chain1 && chain2) {
            if (chain1.usd_value <= 0 && chain2.usd_value <= 0) {
              return (chain2.born_at || 0) - (chain1.born_at || 0);
            }
            return chain2.usd_value - chain1.usd_value;
          }
          return 0;
        });
      }
    }
    return list;
  };

  useEffect(() => {
    if (!list) return;
    const hasUsdValue: T[] = [];
    const hasAmount: T[] = [];
    const others: T[] = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const usdValue = item.price * item.amount;
      if (usdValue > 0) {
        hasUsdValue.push(item);
      } else if (item.amount > 0) {
        hasAmount.push(item);
      } else {
        others.push(item);
      }
    }
    hasUsdValue.sort((a, b) => {
      return b.amount * b.price - a.amount * a.price;
    });
    sortByChainBalance(others).then((list) => {
      setResult([...hasUsdValue, ...hasAmount, ...list]);
    });
  }, [list]);

  return result;
};

export default useSortToken;
