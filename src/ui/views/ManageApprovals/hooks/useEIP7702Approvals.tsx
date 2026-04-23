import { findChain, findChainByEnum } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';

import { Account } from '@/background/service/preference';
import { INTERNAL_REQUEST_SESSION, KEYRING_TYPE } from '@/constant';
import { useWallet } from '@/ui/utils';
import { useRequest } from 'ahooks';
import PQueue from 'p-queue';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fromHex, zeroAddress } from 'viem';
import { EIP7702_REVOKE_SUPPORTED_CHAINS } from '../../DesktopProfile/components/ApprovalsTabPane/useEIP7702Approvals';

const EIP7702SupportedAccountType = [
  KEYRING_TYPE.SimpleKeyring,
  KEYRING_TYPE.HdKeyring,
];

export type EIP7702Delegated = {
  chain: CHAINS_ENUM;
  delegatedAddress: string;
  address: string;
  alias: string;
  list: EIP7702Delegated[];
};

async function checkEIP7702Delegation({
  address,
  chains,
  concurrency = 10,
  wallet,
}: {
  address: string;
  chains: CHAINS_ENUM[];
  concurrency?: number;
  wallet: ReturnType<typeof useWallet>;
}): Promise<({ delegatedAddress: string; chain: CHAINS_ENUM } | undefined)[]> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error('Invalid Ethereum address');
  }

  const queue = new PQueue({ concurrency });

  const tasks = chains
    .filter((chain) => {
      const chainInfo = findChainByEnum(chain);
      return !!chainInfo;
    })
    .map((chain) => async () => {
      const chainInfo = findChainByEnum(chain)!;

      try {
        const code = await wallet.requestETHRpc<string>(
          {
            method: 'eth_getCode',
            params: [address, 'latest'],
          },
          chainInfo!.serverId
        );

        if (!code || code === '0x') {
          console.log(
            `[${chainInfo.name}] No delegate code found for address ${address}. Likely a plain EOA.`
          );
          return;
        }

        if (code.startsWith('0xef0100')) {
          const delegatedAddress = '0x' + code.slice(8);
          console.log(
            `[${chainInfo.name}] EIP-7702 delegation detected! Delegate address: ${delegatedAddress}`
          );

          return {
            delegatedAddress,
            chain: chainInfo.enum,
          };
        }
        return;
      } catch (error) {
        console.error(
          `[${chainInfo.name}] Error querying address:`,
          (error as Error).message
        );
        return;
      }
    });

  return await queue.addAll(tasks);
}

export const useEIP7702ApprovalsQuery = ({
  isActive,
  chain,
  account,
  refreshKey = 0,
  searchKeyword,
}: {
  isActive: boolean;
  chain?: CHAINS_ENUM;
  account?: Account | null;
  refreshKey?: number;
  searchKeyword?: string;
}) => {
  const { t } = useTranslation();
  const currentAccount = account;
  const { address: accountAddress } = currentAccount || {};
  const wallet = useWallet();

  const [searchEIP7702Kw, setSearchEIP7702Kw] = useState('');

  // const wallet = useWallet();

  const [selectedRows, setSelectedRows] = useState<EIP7702Delegated[]>([]);

  const { data: value, loading, error } = useRequest(
    async () => {
      if (!isActive || !accountAddress || !wallet.requestETHRpc) {
        return [];
      }
      return await checkEIP7702Delegation({
        address: accountAddress,
        chains: EIP7702_REVOKE_SUPPORTED_CHAINS,
        wallet,
      });
    },
    {
      refreshDeps: [accountAddress, isActive, refreshKey, wallet],
    }
  );

  const effectiveSearchKeyword = searchKeyword ?? searchEIP7702Kw;
  const rawDelegationAddresses = useMemo(() => {
    if (!currentAccount) {
      return [];
    }

    return (error ? [] : value || [])
      ?.filter((item) => !!item && (chain ? item.chain === chain : true))
      .map(
        (e, _, arr) =>
          (({
            ...e!,
            address: currentAccount.address,
            alias: currentAccount.alianName,
            list: arr,
          } as any) as EIP7702Delegated)
      );
  }, [error, value, chain, currentAccount]);

  const delegationAddresses = useMemo(() => {
    const keyword = effectiveSearchKeyword?.trim().toLowerCase();
    if (!keyword) {
      return rawDelegationAddresses;
    }

    return rawDelegationAddresses.filter((item) =>
      item.delegatedAddress?.toLowerCase().includes(keyword)
    );
  }, [rawDelegationAddresses, effectiveSearchKeyword]);

  const totalCount = rawDelegationAddresses.length;

  const clearState = () => {
    setSelectedRows([]);
  };

  const handleEIP7702Revoke = async () => {
    if (!accountAddress || !currentAccount) {
      return;
    }

    if (!selectedRows.length) {
      return;
    }

    await wallet.revokeEIP7702V2({
      chainList: selectedRows?.map((e) => e.chain),
    });

    clearState();
  };

  const revokeEIP7702 = async ({
    chainList,
    account,
  }: {
    chainList: CHAINS_ENUM[];
    account: Account;
  }) => {
    const queue = new PQueue({
      autoStart: true,
      concurrency: 1,
      timeout: undefined,
    });

    const abortRevoke = new AbortController();

    const revokeList: (() => Promise<void>)[] = chainList.map(
      (chain) => async () => {
        try {
          const chainId = findChain({
            enum: chain,
          })?.id;
          if (!chainId) throw new Error(t('background.error.invalidChainId'));

          const _nonce = await wallet.getRecommendNonce({
            from: account.address,
            chainId,
          });

          const nonce = fromHex(_nonce as `0x${string}`, 'number') + 1;

          const tx: any = {
            from: account.address,
            to: account.address,
            chainId: chainId,
            type: 4,
            nonce: _nonce,
          };
          await wallet.sendRequest(
            {
              $ctx: {
                eip7702Revoke: true,
                eip7702RevokeAuthorization: [[chainId, zeroAddress, nonce]],
              },
              method: 'eth_sendTransaction',
              params: [tx],
            },
            {
              session: INTERNAL_REQUEST_SESSION,
              account,
            }
          );
        } catch (error) {
          abortRevoke.abort();

          console.error(error);
          console.error(`batch revoke ${chain} 7702 error`);
        }
      }
    );

    const waitAbort = new Promise<void>((resolve) => {
      const onAbort = () => {
        queue.clear();
        resolve();

        abortRevoke.signal.removeEventListener('abort', onAbort);
      };
      abortRevoke.signal.addEventListener('abort', onAbort);
    });

    try {
      await Promise.race([queue.addAll(revokeList), waitAbort]);
    } catch (error) {
      console.log('revoke error', error);
    }
  };

  return {
    accountAddress,
    isLoading: loading,
    error,
    data: delegationAddresses,
    totalCount,
    searchEIP7702Kw: effectiveSearchKeyword,
    setSearchEIP7702Kw,
    selectedRows,
    setSelectedRows,
    handleEIP7702Revoke,
  };
};

const buildDelegationKey = (item: EIP7702Delegated) =>
  `${item.chain}:${item.delegatedAddress?.toLowerCase() || ''}`;

type EIP7702ApprovalsContextValue = {
  accountAddress?: string;
  isLoading: boolean;
  error?: Error;
  data: EIP7702Delegated[];
  totalCount: number;
  isSupportedAccount: boolean;
  selectedRows: EIP7702Delegated[];
  setSelectedRows: React.Dispatch<React.SetStateAction<EIP7702Delegated[]>>;
  toggleSelectedRow: (row: EIP7702Delegated) => void;
  clearSelectedRows: () => void;
  refresh: () => void;
  handleEIP7702Revoke: () => Promise<void>;
};

const EIP7702ApprovalsContext = React.createContext<EIP7702ApprovalsContextValue>(
  {
    accountAddress: undefined,
    isLoading: false,
    error: undefined,
    data: [],
    totalCount: 0,
    isSupportedAccount: false,
    selectedRows: [],
    setSelectedRows: () => {},
    toggleSelectedRow: () => {},
    clearSelectedRows: () => {},
    refresh: () => {},
    handleEIP7702Revoke: async () => {},
  }
);

export function useEIP7702Approvals() {
  return React.useContext(EIP7702ApprovalsContext);
}

export function EIP7702ApprovalsProvider({
  account,
  isActive,
  prefetch = false,
  searchKeyword,
  children,
}: React.PropsWithChildren<{
  account: Account | null;
  isActive: boolean;
  prefetch?: boolean;
  searchKeyword?: string;
}>) {
  const [refreshKey, setRefreshKey] = useState(0);
  const shouldQuery = isActive || prefetch;

  const {
    accountAddress,
    isLoading,
    error,
    data,
    totalCount,
    selectedRows,
    setSelectedRows,
    handleEIP7702Revoke,
  } = useEIP7702ApprovalsQuery({
    isActive: shouldQuery,
    account,
    refreshKey,
    searchKeyword,
  });
  const isSupportedAccount = useMemo(() => {
    if (!account?.type) {
      return false;
    }
    return EIP7702SupportedAccountType.includes(account.type as any);
  }, [account?.type]);

  const clearSelectedRows = useCallback(() => {
    setSelectedRows([]);
  }, [setSelectedRows]);

  const toggleSelectedRow = useCallback(
    (row: EIP7702Delegated) => {
      const rowKey = buildDelegationKey(row);
      setSelectedRows((prev) => {
        const hasRow = prev.some((item) => buildDelegationKey(item) === rowKey);
        if (hasRow) {
          return prev.filter((item) => buildDelegationKey(item) !== rowKey);
        }
        return prev.concat(row);
      });
    },
    [setSelectedRows]
  );

  const refresh = useCallback(() => {
    clearSelectedRows();
    setRefreshKey((prev) => prev + 1);
  }, [clearSelectedRows]);

  useEffect(() => {
    if (!isActive) {
      clearSelectedRows();
    }
  }, [isActive, clearSelectedRows]);

  useEffect(() => {
    if (!selectedRows.length || !data.length) {
      if (selectedRows.length && !data.length) {
        clearSelectedRows();
      }
      return;
    }

    const dataKeySet = new Set(data.map(buildDelegationKey));
    const nextSelected = selectedRows.filter((item) =>
      dataKeySet.has(buildDelegationKey(item))
    );
    if (nextSelected.length !== selectedRows.length) {
      setSelectedRows(nextSelected);
    }
  }, [data, selectedRows, setSelectedRows, clearSelectedRows]);

  const value = useMemo<EIP7702ApprovalsContextValue>(
    () => ({
      accountAddress,
      isLoading,
      error: error as Error | undefined,
      data,
      totalCount,
      isSupportedAccount,
      selectedRows,
      setSelectedRows,
      toggleSelectedRow,
      clearSelectedRows,
      refresh,
      handleEIP7702Revoke,
    }),
    [
      accountAddress,
      isLoading,
      error,
      data,
      totalCount,
      isSupportedAccount,
      selectedRows,
      setSelectedRows,
      toggleSelectedRow,
      clearSelectedRows,
      refresh,
      handleEIP7702Revoke,
    ]
  );

  return (
    <EIP7702ApprovalsContext.Provider value={value}>
      {children}
    </EIP7702ApprovalsContext.Provider>
  );
}
