import { useEffect, useState } from 'react';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { AbstractPortfolioToken } from '../utils/portfolio/types';
import { useWallet } from 'ui/utils';
import { useRabbySelector } from 'ui/store';

const isSameSortedResult = <T extends TokenItem | AbstractPortfolioToken>(
  prev: T[],
  next: T[]
) => {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;

  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (a === b) continue;
    if (
      a.id !== b.id ||
      a.chain !== b.chain ||
      a.amount !== b.amount ||
      a.price !== b.price ||
      a.is_core !== b.is_core
    ) {
      return false;
    }
  }

  return true;
};

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
    let canceled = false;
    const hasUsdValue: T[] = [];
    const hasAmount: T[] = [];
    const others: T[] = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const usdValue = item.price * item.amount;
      if (usdValue > 0 && item.is_core) {
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
    sortByChainBalance(others).then((sortedOthers) => {
      if (canceled) return;
      const nextResult = [...hasUsdValue, ...hasAmount, ...sortedOthers];
      setResult((prev) =>
        isSameSortedResult(prev, nextResult) ? prev : nextResult
      );
    });
    return () => {
      canceled = true;
    };
  }, [list]);

  return result;
};

export default useSortToken;
