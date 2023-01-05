import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { isSameAddress, useWallet, WalletControllerType } from '@/ui/utils';
import { message } from 'antd';
import PQueue from 'p-queue';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { Account } from './AccountList';

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// cached chains, balance, firstTxTime
const cachedAccountInfo = new Map<string, Account>();

export const fetchAccountsInfo = async (
  wallet: WalletControllerType,
  accounts: Account[]
) => {
  return await Promise.all(
    accounts.map(async (account) => {
      let firstTxTime;
      let balance;
      const address = account.address.toLowerCase();
      if (!address) return account;

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

      let chains: Account['chains'];
      try {
        chains = await wallet.openapi.usedChainList(account.address);

        // if has chains, get balance and firstTxTime from api
        if (chains.length) {
          const res = await wallet.openapi.getTotalBalance(account.address);
          balance = res.total_usd_value;
          const allChains = res.chain_list;

          allChains.forEach((chain: any) => {
            if (chain.born_at) {
              firstTxTime = Math.min(firstTxTime ?? Infinity, chain.born_at);
            }
          });
        }
      } catch (e) {
        console.error('ignore api error', e);
      }
      const accountInfo: Account = {
        ...account,
        chains,
        balance,
        firstTxTime,
      };

      cachedAccountInfo.set(address, accountInfo);

      return accountInfo;
    })
  );
};

const useGetCurrentAccounts = ({ keyringId }: StateProviderProps) => {
  const wallet = useWallet();
  const [loading, setLoading] = React.useState(false);
  const [accounts, setAccounts] = React.useState<Account[]>([]);

  const getCurrentAccounts = React.useCallback(async () => {
    setLoading(true);
    const accounts = (await wallet.requestKeyring(
      HARDWARE_KEYRING_TYPES.Ledger.type,
      'getCurrentAccounts',
      keyringId
    )) as Account[];

    // fetch aliasName
    const accountsWithAliasName = await Promise.all(
      accounts.map(async (account) => {
        const aliasName = await wallet.getAlianName(account.address);
        account.aliasName = aliasName;
        return account;
      })
    );

    setAccounts(accountsWithAliasName);
    setLoading(false);
  }, []);

  const removeCurrentAccount = React.useCallback((address: string) => {
    setAccounts((accounts) => {
      return accounts.filter(
        (account) => !isSameAddress(account.address, address)
      );
    });
  }, []);

  const updateCurrentAccountAliasName = React.useCallback(
    (address: string, aliasName: string) => {
      setAccounts((accounts) => {
        return accounts.map((account) => {
          if (isSameAddress(account.address, address)) {
            account.aliasName = aliasName;
          }
          return account;
        });
      });
    },
    []
  );

  return {
    currentAccountsLoading: loading,
    getCurrentAccounts,
    currentAccounts: accounts,
    removeCurrentAccount,
    updateCurrentAccountAliasName,
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
  const history = useHistory();

  const createTask = React.useCallback(async (task: () => Promise<any>) => {
    return queueRef.current.add(task);
  }, []);

  React.useEffect(() => {
    queueRef.current.on('error', (e) => {
      console.error(e);
      message.error({
        content:
          'Unable to connect to Hardware wallet. Please try to re-connect.',
        key: 'ledger-error',
      });
      history.goBack();
    });

    return () => {
      queueRef.current.clear();
    };
  }, []);

  return { queueRef, createTask };
};

export interface StateProviderProps {
  // FIXME:
  // it's not important, only one instance of ledger keyring will be created,
  // 'connectHardware' will not return keyringId if keyring already exists, so we
  // don't know the keyringId now.
  keyringId: number | null;
}

export const LedgerManagerStateContext = React.createContext<
  ReturnType<typeof useGetCurrentAccounts> &
    ReturnType<typeof useManagerTab> &
    ReturnType<typeof useHiddenInfo> &
    ReturnType<typeof useTaskQueue> &
    StateProviderProps
>({} as any);

export const LedgerManagerStateProvider: React.FC<StateProviderProps> = ({
  children,
  keyringId,
}) => {
  return (
    <LedgerManagerStateContext.Provider
      value={{
        ...useGetCurrentAccounts({ keyringId }),
        ...useManagerTab(),
        ...useHiddenInfo(),
        ...useTaskQueue(),
        keyringId,
      }}
    >
      {children}
    </LedgerManagerStateContext.Provider>
  );
};
