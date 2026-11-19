import { isSameAddress, useWallet, WalletControllerType } from '@/ui/utils';
import { message } from 'antd';
import PQueue from 'p-queue';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { Account } from './AccountList';
import * as Sentry from '@sentry/browser';
import { KEYRING_CLASS } from '@/constant';
import { useImportMnemonicsStore } from '@/ui/state/importMnemonics';
import { useTranslation } from 'react-i18next';
import { useMemoizedFn } from 'ahooks';
import { getAccountInfoLoader } from './accountInfo';

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const fetchAccountsInfo = async (
  wallet: WalletControllerType,
  accounts: Account[]
) => {
  const loader = getAccountInfoLoader(wallet);
  return Promise.all(
    accounts.map(async (account) => ({
      ...account,
      ...(await loader.load(account.address)),
    }))
  );
};

const useGetCurrentAccounts = ({ keyringId, keyring }: StateProviderProps) => {
  const wallet = useWallet();
  const [loading, setLoading] = React.useState(false);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [initialAccounts, setInitialAccounts] = React.useState<Account[]>([]);
  const initialAccountsRef = React.useRef<Account[] | null>(null);

  const getCurrentAccounts = React.useCallback(
    async (options?: { resetInitialAccounts?: boolean }) => {
      setLoading(true);
      const accounts: Account[] = [];
      if (keyring === KEYRING_CLASS.MNEMONIC) {
        const list = await useImportMnemonicsStore
          .getState()
          .getImportedAccounts({});
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
      if (options?.resetInitialAccounts || !initialAccountsRef.current) {
        initialAccountsRef.current = accountsWithAliasName;
        setInitialAccounts(accountsWithAliasName);
      }
      setLoading(false);
      return accountsWithAliasName;
    },
    []
  );

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
    initialAccounts,
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

const useSelectedAccounts = () => {
  const [selectedAccounts, setSelectedAccounts] = React.useState<Account[]>([]);

  const updateSelectedAccountAliasName = useMemoizedFn(
    (address: string, aliasName: string) => {
      setSelectedAccounts((accounts) => {
        return accounts.map((account) => {
          if (isSameAddress(account.address, address)) {
            account.aliasName = aliasName;
          }
          return account;
        });
      });
    }
  );
  return {
    selectedAccounts,
    setSelectedAccounts,
    updateSelectedAccountAliasName,
  };
};

// !IMPORTANT!: Ledger instance only allow one request at a time,
// so we need a queue to control the request.
const useTaskQueue = ({ keyring }) => {
  const queueRef = React.useRef(new PQueue({ concurrency: 1 }));
  const disposedRef = React.useRef(false);
  const history = useHistory();
  const { t } = useTranslation();

  const createTask = React.useCallback(async (task: () => Promise<any>) => {
    return queueRef.current.add(task);
  }, []);

  React.useEffect(() => {
    disposedRef.current = false;
    const handleError = (e) => {
      if (disposedRef.current) {
        return;
      }
      console.error(e);
      Sentry.captureException(e);
      // A seed phrase has no device to reconnect, so the hardware wording
      // misleads; surface the real reason (e.g. an expired import session).
      const content =
        keyring === KEYRING_CLASS.MNEMONIC
          ? (typeof e?.message === 'string' && e.message) ||
            t('page.newAddress.hd.tooltip.connectError')
          : t('page.newAddress.hd.tooltip.disconnected');
      message.error({
        content,
        key: 'ledger-error',
      });
      if (keyring !== KEYRING_CLASS.HARDWARE.GRIDPLUS) {
        history.goBack();
      }
    };
    queueRef.current.on('error', handleError);

    return () => {
      disposedRef.current = true;
      queueRef.current.off('error', handleError);
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
  isLazyImport?: boolean;
  children?: React.ReactNode;
  onDone?(): void;
}

export const HDManagerStateContext = React.createContext<
  ReturnType<typeof useGetCurrentAccounts> &
    ReturnType<typeof useManagerTab> &
    ReturnType<typeof useSelectedAccounts> &
    ReturnType<typeof useTaskQueue> &
    StateProviderProps
>({} as any);

export const HDManagerStateProvider: React.FC<StateProviderProps> = ({
  children,
  keyringId,
  keyring,
  isLazyImport,
  brand,
}) => {
  return (
    <HDManagerStateContext.Provider
      value={{
        ...useGetCurrentAccounts({ keyringId, keyring }),
        ...useManagerTab(),
        ...useSelectedAccounts(),
        ...useTaskQueue({ keyring }),
        keyringId,
        keyring,
        isLazyImport,
        brand,
      }}
    >
      {children}
    </HDManagerStateContext.Provider>
  );
};
