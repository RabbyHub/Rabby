import { useMemoizedFn } from 'ahooks';
import { useEffect, useMemo, useState } from 'react';
import type { Account } from '../AccountList';
import { useWallet } from '@/ui/utils';
import { getAccountInfoLoader } from '../accountInfo';

export const useQueryAccountsInfo = () => {
  const [result, setResult] = useState<Record<string, Account>>({});
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});
  const wallet = useWallet();
  const session = useMemo(
    () => ({
      loader: getAccountInfoLoader(wallet),
      pending: new Set<string>(),
      active: true,
    }),
    [wallet]
  );

  useEffect(() => {
    session.active = true;
    return () => {
      session.active = false;
    };
  }, [session]);

  const createQueryAccountJob = useMemoizedFn(async (account: Account) => {
    const address = account.address?.toLowerCase();
    if (!address || !session.active || session.pending.has(address)) return;

    session.pending.add(address);
    setPendingMap((pre) => ({ ...pre, [address]: true }));
    try {
      // Cache hits still populate this table's state after a tab change.
      const info = await session.loader.load(address);
      if (session.active) {
        setResult((pre) => ({
          ...pre,
          [address]: { ...account, ...info },
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      session.pending.delete(address);
      if (session.active) {
        setPendingMap((pre) => ({ ...pre, [address]: false }));
      }
    }
  });

  return {
    accountsMap: result,
    pendingMap,
    createQueryAccountJob,
  };
};
