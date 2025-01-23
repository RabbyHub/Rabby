import { useCreation, useMemoizedFn } from 'ahooks';
import PQueue from 'p-queue';
import { useState } from 'react';
import { Account } from '../AccountList';
import { useWallet } from '@/ui/utils';
import { isFunction } from 'lodash';
import { sleep } from '../utils';

// cached chains, balance, firstTxTime
const cachedAccountInfo = new Map<string, Account>();

export const useQueryAccountsInfo = () => {
  const [result, setResult] = useState<Record<string, Account>>({});
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});
  const queue = useCreation(() => new PQueue({ concurrency: 2 }), []);
  const wallet = useWallet();

  const fetchAccountInfo = useMemoizedFn(async (account: Account) => {
    let firstTxTime;
    let balance;
    const address = account.address?.toLowerCase();
    if (!address) return account;

    let needCache = true;

    if (cachedAccountInfo.has(address)) {
      const cached = cachedAccountInfo.get(address);
      if (cached) {
        return {
          ...account,
          chains: cached.chains,
          balance: cached.balance,
          firstTxTime: cached.firstTxTime,
        };
      }
    }

    let chains: Account['chains'] = [];
    try {
      chains = await wallet.openapi.usedChainList(account.address);
    } catch (e) {
      console.error('ignore usedChainList error', e);
      needCache = false;
    }
    try {
      // if has chains, get balance from api
      if (chains?.length) {
        const res = await wallet.openapi.getTotalBalance(account.address);
        balance = res.total_usd_value;
      }
    } catch (e) {
      console.error('ignore getTotalBalance error', e);
      needCache = false;
    }

    // find firstTxTime
    if (isFunction(chains?.forEach)) {
      chains?.forEach((chain: any) => {
        if (chain.born_at) {
          firstTxTime = Math.min(firstTxTime ?? Infinity, chain.born_at);
        }
      });
    }

    const accountInfo: Account = {
      ...account,
      chains,
      balance,
      firstTxTime,
    };

    if (needCache) {
      cachedAccountInfo.set(address, accountInfo);
    }

    return accountInfo;
  });

  const createQueryAccountJob = useMemoizedFn(async (account: Account) => {
    if (
      pendingMap[account.address] ||
      result[account.address] ||
      cachedAccountInfo.get(account.address)
    ) {
      return;
    }
    setPendingMap((pre) => {
      return {
        ...pre,
        [account.address]: true,
      };
    });
    try {
      const r = await queue.add(async () => {
        await sleep(300);
        return fetchAccountInfo(account);
      });
      setResult((pre) => {
        return {
          ...pre,
          [account.address]: r,
        };
      });
    } catch (e) {
      console.error(e);
    } finally {
      setPendingMap((pre) => {
        return {
          ...pre,
          [account.address]: false,
        };
      });
    }
  });

  return {
    accountsMap: result,
    pendingMap,
    createQueryAccountJob,
  };
};
