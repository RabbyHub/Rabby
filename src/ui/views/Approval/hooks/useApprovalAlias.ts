import { useWallet } from '@/ui/utils';
import React from 'react';

type AccountWithAliasName = {
  address: string;
  alias?: string;
};

export const useApprovalAlias = () => {
  const [accounts, setAccounts] = React.useState<AccountWithAliasName[]>([]);
  const wallet = useWallet();

  const accountMap = React.useMemo(() => {
    return accounts.reduce((acc, account) => {
      acc[account.address] = account;
      return acc;
    }, {} as Record<string, AccountWithAliasName>);
  }, [accounts]);

  const add = React.useCallback(
    async (address: string) => {
      if (accounts.some((account) => account.address === address)) {
        return accounts;
      }
      const alias = await wallet.getAlianName(address);
      setAccounts([...accounts, { address, alias }]);
    },
    [accounts]
  );

  const update = React.useCallback((address: string, alias: string) => {
    setAccounts((accounts) => {
      return accounts.map((account) => {
        if (account.address === address) {
          wallet.updateAlianName(address, alias);
          return { ...account, alias };
        }
        return account;
      });
    });
  }, []);

  return { accountMap, add, update };
};
