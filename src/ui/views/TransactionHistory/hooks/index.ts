import {
  TransactionGroup,
  TransactionHistoryItem,
} from '@/background/service/transactionHistory';
import { isSameAddress, useWallet } from '@/ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import { findChainByID } from '@/utils/chain';
import { getPendingGroupCategory } from '@/utils/tx';
import { CHAINS } from '@debank/common';
import { TokenItem, TxRequest } from '@rabby-wallet/rabby-api/dist/types';
import { useInterval, useRequest } from 'ahooks';
import { flatten, get, keyBy, maxBy, minBy } from 'lodash';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const useTxRequests = (
  reqIds: string | string[],
  options?: {
    onSuccess?: (data: Record<string, TxRequest>) => void;
  }
) => {
  const wallet = useWallet();
  const onSuccess = options?.onSuccess;
  return useRequest(
    async () => {
      const res = await wallet.openapi.getTxRequests(reqIds);
      return keyBy(res, 'id');
    },
    {
      refreshDeps: [Array.isArray(reqIds) ? reqIds.join(',') : reqIds],
      onSuccess,
    }
  );
};

export const useGetTx = ({
  hash,
  serverId,
  gasPrice,
}: {
  hash?: string;
  serverId?: string;
  gasPrice: number;
}) => {
  const wallet = useWallet();
  return useRequest(
    async () => {
      if (!hash || !serverId) {
        return;
      }
      const res = await wallet.openapi.getTx(serverId, hash, gasPrice);
      return res;
    },
    {
      cacheKey: `${serverId}-${hash}-${gasPrice}`,
      refreshDeps: [hash, serverId, gasPrice],
    }
  );
};

// todo fix
export const useLoadTxRequests = (
  pendings: TransactionGroup[],
  options?: {
    onSuccess?: (data: Record<string, TxRequest>) => void;
  }
) => {
  const { unbroadcastedTxs } = getPendingGroupCategory(pendings);
  const wallet = useWallet();
  const testnetTxs: TransactionHistoryItem[] = [];
  const mainnetTxs: TransactionHistoryItem[] = [];

  unbroadcastedTxs.forEach((tx) => {
    const chain = findChainByID(tx.rawTx.chainId);
    if (chain?.isTestnet) {
      testnetTxs.push(tx);
    } else {
      mainnetTxs.push(tx);
    }
  });

  const onSuccess = options?.onSuccess;
  const { data, runAsync } = useRequest(
    async () => {
      const res = await Promise.all([
        testnetTxs?.length
          ? wallet.testnetOpenapi
              .getTxRequests(testnetTxs.map((tx) => tx.reqId) as string[])
              .catch(() => [])
          : [],
        mainnetTxs?.length
          ? wallet.openapi
              .getTxRequests(mainnetTxs.map((tx) => tx.reqId) as string[])
              .catch(() => [])
          : [],
      ]);
      const map = keyBy(flatten(res), 'id');
      return map;
    },
    {
      onSuccess,
      refreshDeps: [unbroadcastedTxs.map((tx) => tx.reqId).join(',')],
    }
  );

  return {
    txRequests: data || {},
    reloadTxRequests: runAsync,
  };
};

export const useLoadTxData = (item: TransactionGroup) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const chain = Object.values(CHAINS).find((c) => c.id === item.chainId)!;

  const completedTx = item.txs.find((tx) => tx.isCompleted);
  const isCompleted = !item.isPending || item.isSubmitFailed;

  // const [txQueues, setTxQueues] = useState<
  //   Record<
  //     string,
  //     {
  //       frontTx?: number;
  //       gasUsed?: number;
  //       token?: TokenItem;
  //       tokenCount?: number;
  //     }
  //   >
  // >({});
  const hasTokenPrice = !!item.explain?.native_token;
  const gasTokenCount =
    hasTokenPrice && completedTx
      ? (Number(
          completedTx.rawTx.gasPrice || completedTx.rawTx.maxFeePerGas || 0
        ) *
          (completedTx.gasUsed || 0)) /
        1e18
      : 0;
  const gasUSDValue = gasTokenCount
    ? (item.explain.native_token.price * gasTokenCount).toFixed(2)
    : 0;
  const gasTokenSymbol = hasTokenPrice
    ? getTokenSymbol(item.explain.native_token)
    : '';

  const loadTxData = async () => {
    if (gasTokenCount) return;

    const results = await Promise.all(
      item.txs
        .filter((tx) => !tx.isSubmitFailed && !tx.isWithdrawed && tx.hash)
        .map((tx) =>
          wallet.openapi.getTx(
            chain.serverId,
            tx.hash!,
            Number(tx.rawTx.gasPrice || tx.rawTx.maxFeePerGas || 0)
          )
        )
    );
    let map: Record<
      string,
      {
        frontTx?: number;
        gasUsed?: number;
        token?: TokenItem;
        tokenCount?: number;
      }
    > = {};

    results.forEach(
      ({ code, status, front_tx_count, gas_used, token }, index) => {
        if (isCompleted) {
          if (!completedTx!.gasUsed) {
            map = {
              ...map,
              [item.txs[index].hash!]: {
                token,
                tokenCount:
                  (gas_used *
                    Number(
                      completedTx!.rawTx.gasPrice ||
                        completedTx!.rawTx.maxFeePerGas ||
                        0
                    )) /
                  1e18,
                gasUsed: gas_used,
              },
            };
          } else if (code === 0) {
            map = {
              ...map,
              [item.txs[index].hash!]: {
                token,
                gasUsed: completedTx!.gasUsed,
                tokenCount:
                  (completedTx!.gasUsed *
                    Number(
                      completedTx!.rawTx.gasPrice ||
                        completedTx!.rawTx.maxFeePerGas ||
                        0
                    )) /
                  1e18,
              },
            };
          }
        } else if (status !== 0 && code === 0) {
          // wallet.completedTransaction({
          //   address: item.txs[index].rawTx.from,
          //   chainId: Number(item.txs[index].rawTx.chainId),
          //   nonce: Number(item.txs[index].rawTx.nonce),
          //   hash: item.txs[index].hash,
          //   success: status === 1,
          //   gasUsed: gas_used,
          // });
        } else {
          map = {
            ...map,
            [item.txs[index].hash!]: {
              frontTx: front_tx_count,
            },
          };
        }
      }
    );
    if (!isCompleted && results.some((i) => i.status !== 0 && i.code === 0)) {
      // onComplete && onComplete();
    } else {
      return map;
    }
  };

  const { data: txQueues, runAsync: runLoadTxData } = useRequest(loadTxData);

  return {
    txQueues: txQueues || {},
    runLoadTxData,
    gasTokenSymbol,
    gasUSDValue,
    gasTokenCount,
  };
};
