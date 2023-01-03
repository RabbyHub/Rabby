import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { useWallet, WalletControllerType } from '@/ui/utils';
import { message } from 'antd';
import React from 'react';
import { Account } from './AccountList';

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const cachedAccountInfo = new Map<string, Account>();

export const fetchAccountsInfo = async (
  wallet: WalletControllerType,
  accounts: Account[]
) => {
  return await Promise.all(
    accounts.map(async (account) => {
      let firstTxTime;
      const address = account.address;
      if (!address) return account;

      if (cachedAccountInfo.has(address)) {
        const cached = cachedAccountInfo.get(address);
        if (cached) {
          return cached;
        }
      }

      const aliasName = await wallet.getAlianName(address);
      const res = await wallet.openapi.getTotalBalance(account.address);
      const balance = res.total_usd_value;
      const chains = res.chain_list;

      chains.forEach((chain: any) => {
        if (chain.born_at) {
          firstTxTime = Math.min(firstTxTime ?? Infinity, chain.born_at);
        }
      });
      const accountInfo: Account = {
        ...account,
        chains,
        balance,
        firstTxTime,
        aliasName,
      };

      cachedAccountInfo.set(address, accountInfo);

      return accountInfo;
    })
  );
};

export const useGetCurrentAccounts = () => {
  const wallet = useWallet();
  const retryCountRef = React.useRef(0);
  const [loading, setLoading] = React.useState(false);
  const [accounts, setAccounts] = React.useState<Account[]>([]);

  const getCurrentAccounts = React.useCallback(async () => {
    try {
      setLoading(true);
      const accounts = (await wallet.requestKeyring(
        HARDWARE_KEYRING_TYPES.Ledger.type,
        'getCurrentAccounts',
        null
      )) as Account[];
      setAccounts(accounts);
    } catch (e) {
      // maybe request not finished in previous tab
      if (/busy/.test(e.message)) {
        await sleep(1000);
        if (retryCountRef.current > 3) {
          retryCountRef.current = 0;
          message.error('Ledger is busy, please try again later');
          return;
        }

        retryCountRef.current += 1;
        getCurrentAccounts();
      } else {
        message.error(e.message);
      }
    }
    setLoading(false);
    retryCountRef.current = 0;
  }, []);

  return {
    loading,
    getCurrentAccounts,
    accounts,
  };
};
