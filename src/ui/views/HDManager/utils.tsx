import { isSameAddress, useWallet, WalletControllerType } from '@/ui/utils';
import { message } from 'antd';
import PQueue from 'p-queue';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { Account } from './AccountList';
import * as Sentry from '@sentry/browser';
import { KEYRING_CLASS } from '@/constant';
import { useRabbyDispatch } from '@/ui/store';
import { useTranslation } from 'react-i18next';
import { isFunction } from 'lodash';

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
    })
  );
};

const useGetCurrentAccounts = ({ keyringId, keyring }: StateProviderProps) => {
  const wallet = useWallet();
  const [loading, setLoading] = React.useState(false);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const dispatch = useRabbyDispatch();

  const getCurrentAccounts = React.useCallback(async () => {
    setLoading(true);
    const accounts: Account[] = [];
    if (keyring === KEYRING_CLASS.MNEMONIC) {
      const list = await dispatch.importMnemonics.getImportedAccounts({});
      accounts.push(...list);
    } else {
      accounts.push(
        ...(await wallet.requestKeyring(
          keyring,
          'getCurrentAccounts',
          keyringId
        ))
      );
    }

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
  const [tab, setTab] = React.useState<'hd' | 'rabby'>('hd');

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
const useTaskQueue = ({ keyring }) => {
  const queueRef = React.useRef(new PQueue({ concurrency: 1 }));
  const history = useHistory();
  const { t } = useTranslation();

  const createTask = React.useCallback(async (task: () => Promise<any>) => {
    return queueRef.current.add(task);
  }, []);

  React.useEffect(() => {
    queueRef.current.on('error', (e) => {
      console.error(e);
      Sentry.captureException(e);
      message.error({
        content: t('page.newAddress.hd.tooltip.disconnected'),
        key: 'ledger-error',
      });
      if (keyring !== KEYRING_CLASS.HARDWARE.GRIDPLUS) {
        history.goBack();
      }
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
  keyring: string;
  brand?: string;
}

export const HDManagerStateContext = React.createContext<
  ReturnType<typeof useGetCurrentAccounts> &
    ReturnType<typeof useManagerTab> &
    ReturnType<typeof useHiddenInfo> &
    ReturnType<typeof useTaskQueue> &
    StateProviderProps
>({} as any);

export const HDManagerStateProvider: React.FC<StateProviderProps> = ({
  children,
  keyringId,
  keyring,
}) => {
  return (
    <HDManagerStateContext.Provider
      value={{
        ...useGetCurrentAccounts({ keyringId, keyring }),
        ...useManagerTab(),
        ...useHiddenInfo(),
        ...useTaskQueue({ keyring }),
        keyringId,
        keyring,
      }}
    >
      {children}
    </HDManagerStateContext.Provider>
  );
};
