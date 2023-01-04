import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { useWallet, WalletControllerType } from '@/ui/utils';
import { message } from 'antd';
import PQueue from 'p-queue';
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
      const address = account.address.toLowerCase();
      if (!address) return account;
      const aliasName = await wallet.getAlianName(address);

      if (cachedAccountInfo.has(address)) {
        const cached = cachedAccountInfo.get(address);
        if (cached) {
          return {
            ...cached,
            aliasName,
          };
        }
      }

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

const useGetCurrentAccounts = () => {
  const wallet = useWallet();
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
      const fullAccounts = await fetchAccountsInfo(wallet, accounts);
      setAccounts(fullAccounts);
    } catch (e) {
      message.error(e.message);
    }
    setLoading(false);
  }, []);

  return {
    currentAccountsLoading: loading,
    getCurrentAccounts,
    currentAccounts: accounts,
  };
};

const useManagerTab = () => {
  const [tab, setTab] = React.useState<'ledger' | 'rabby'>('ledger');

  return {
    tab,
    setTab,
  };
};

const useHiddenInfo = () => {
  const [hiddenInfo, setHiddenInfo] = React.useState(true);
  return {
    hiddenInfo,
    setHiddenInfo,
  };
};

// !IMPORTANT!: Ledger instance only allow one request at a time,
// so we need a queue to control the request.
const useTaskQueue = () => {
  const queueRef = React.useRef(new PQueue({ concurrency: 1 }));

  const createTask = React.useCallback(async (task: () => Promise<any>) => {
    console.log(task);
    return queueRef.current.add(task);
  }, []);

  return { queueRef, createTask };
};

export const LedgerManagerStateContext = React.createContext<
  ReturnType<typeof useGetCurrentAccounts> &
    ReturnType<typeof useManagerTab> &
    ReturnType<typeof useHiddenInfo> &
    ReturnType<typeof useTaskQueue>
>({} as any);

export const LedgerManagerStateProvider: React.FC = ({ children }) => {
  return (
    <LedgerManagerStateContext.Provider
      value={{
        ...useGetCurrentAccounts(),
        ...useManagerTab(),
        ...useHiddenInfo(),
        ...useTaskQueue(),
      }}
    >
      {children}
    </LedgerManagerStateContext.Provider>
  );
};
