import { useCallback, useMemo } from 'react';

import { SendRequireData } from '@rabby-wallet/rabby-action';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import { unionBy } from 'lodash';

import { findChain } from '@/utils/chain';
import { useWallet, WalletControllerType } from '@/ui/utils';
import { TransactionGroup } from '@/background/service/transactionHistory';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useRabbyGetter } from '@/ui/store';
import { findMaxGasTx } from '@/utils/tx';
import { isValidAddress } from '@ethereumjs/util';

interface DisplayHistoryItem {
  isDateStart?: boolean;
  time: number;
  data: TransactionGroup;
}
function markFirstItems(arr: TransactionGroup[]): DisplayHistoryItem[] {
  if (arr.length === 0) {
    return [];
  }
  const newArr: DisplayHistoryItem[] = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const newItem: DisplayHistoryItem = {
      data: item,
      time:
        'completedAt' in item && item.completedAt
          ? item.completedAt
          : 'isPending' in item && item.isPending
          ? Date.now()
          : 0,
    };

    const prev = arr[i - 1];

    if (i === 0) {
      newItem.isDateStart = true;
    } else {
      const curDate = dayjs(newItem.time);
      const prevTime =
        // ('time_at' in prev ? prev.time_at * 1000 : undefined) ||
        'completedAt' in prev && prev.completedAt
          ? prev.completedAt
          : 'isPending' in prev && prev.isPending
          ? Date.now()
          : 0;
      const prevDate = dayjs(prevTime);
      if (newItem.time && !curDate.isSame(prevDate, 'day')) {
        newItem.isDateStart = true;
      }
    }

    newArr.push(newItem);
  }

  return newArr;
}

/**
 * @description fetch local sending/sent tx
 * @param address
 */
const fetchLocalSendTx = async (
  wallet: WalletControllerType,
  address: string
) => {
  const {
    completeds: _completeds,
    pendings: _pendings,
  } = await wallet.getTransactionHistory(address);

  return [..._pendings, ..._completeds].filter((item) => {
    const chain = findChain({ id: item.chainId });
    return (
      !chain?.isTestnet &&
      !findMaxGasTx(item.txs).action?.actionData.cancelTx &&
      item.$ctx?.ga?.source === 'sendToken'
    );
  });
};

export type RecentHistoryItem = {
  toAddress: string;
  /**
   * @description unix timestamp in seconds
   */
  time: number;
  isFailed: boolean;
  isPending: boolean;
};
export const useRecentSend = ({
  useAllHistory,
}: {
  useAllHistory?: boolean;
} = {}) => {
  const wallet = useWallet();

  const myImportedAccounts = useRabbyGetter(
    (s) => s.accountToDisplay.myImportedAccounts
  );

  const unionAccounts = useMemo(() => {
    return unionBy(myImportedAccounts, (account) =>
      account.address.toLowerCase()
    );
  }, [myImportedAccounts]);

  const currentAccount = useCurrentAccount();
  const singleAccountList = useMemo(() => {
    return [currentAccount];
  }, [currentAccount]);
  const accountList = useAllHistory ? unionAccounts : singleAccountList;

  const batchFetchLocalTx = useCallback(async () => {
    const list: TransactionGroup[] = [];

    for (let i = 0; i < accountList.length; i++) {
      const account = accountList[i];
      if (!account) {
        continue;
      }
      const addr = account.address.toLowerCase();
      const localTxs = await fetchLocalSendTx(wallet, addr);
      list.push(...localTxs);
    }
    return list;
  }, [accountList]);

  const { data: historyList, runAsync } = useRequest(
    async () => {
      return batchFetchLocalTx();
    },
    {
      refreshDeps: [batchFetchLocalTx],
    }
  );

  const markedList = useMemo(() => {
    const sortedList = historyList?.sort(
      (a, b) =>
        (b.isPending ? Date.now() : findMaxGasTx(b.txs)?.completedAt || 0) -
        (a.isPending ? Date.now() : findMaxGasTx(a.txs)?.completedAt || 0)
    );

    // return sortedList;

    return markFirstItems(
      unionBy(sortedList, (item) => {
        // if ('projectDict' in item) {
        //   return `${item.txs[0]?.address?.toLowerCase()}-${(item as unknown as TxDisplayItem).id
        //     }`;
        // } else {
        //   return `${item.txs[0]?.address?.toLowerCase()}-${findMaxGasTx(item.txs)?.hash}`;
        // }
        return `${item.action?.actionData?.send?.to?.toLowerCase()}-${
          findMaxGasTx(item.txs)?.hash
        }`;
      }) || []
    );
  }, [historyList]);

  const recentHistory: RecentHistoryItem[] = useMemo(() => {
    return markedList
      .sort((a, b) => b.time - a.time)
      .filter((item) => item.time > Date.now() - 60 * 60 * 1000) // in 1 hours
      .map((item) => {
        /* if ('project_item' in item.data) {
          return {
            toAddress: item.data.sends[0].to_addr,
            time: item.time / 1000,
            isFailed: item.data.tx?.status !== 1,
            isPending: false,
          };
        } else  */ {
          const maxGasTx = findMaxGasTx(item.data.txs);
          return {
            toAddress:
              maxGasTx?.action?.actionData.send?.to ||
              (maxGasTx?.action?.requiredData as SendRequireData)?.protocol
                ?.name ||
              '',
            time: item.time / 1000,
            isFailed:
              item.data.isSubmitFailed ||
              item.data.isFailed ||
              !!maxGasTx?.isWithdrawed,
            isPending: item.data.isPending,
          };
        }
      })
      .filter(
        (item) =>
          item.toAddress.length &&
          item.time &&
          !item.isFailed &&
          !item.isPending
      )
      .slice(0, 3);
  }, [markedList]);

  return {
    // markedList,
    runAsync,
    recentHistory,
  };
};

export const fetchLocalSendPendingTx = (
  wallet: WalletControllerType,
  address: string
) => {
  return wallet.getRecentPendingTxHistory(address, 'send');
};

export function useRecentSendToHistoryFor(toAddress?: string) {
  const { recentHistory } = useRecentSend({ useAllHistory: true });

  return {
    recentHistory:
      toAddress && isValidAddress(toAddress)
        ? recentHistory.filter(
            (item) => item.toAddress.toLowerCase() === toAddress.toLowerCase()
          )
        : [],
  };
}
