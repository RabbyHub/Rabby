import { useEffect, useState } from 'react';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { AbstractPortfolioToken } from '../utils/portfolio/types';

const useSortToken = <T extends TokenItem | AbstractPortfolioToken>(
  list?: T[]
) => {
  const [result, setResult] = useState<T[]>([]);

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
    // TODO: others sortBy address chain balance
    setResult([...hasUsdValue, ...hasAmount, ...others]);
  }, [list]);

  return result;
};

export default useSortToken;
