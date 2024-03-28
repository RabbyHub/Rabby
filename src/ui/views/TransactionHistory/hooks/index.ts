import {
  TransactionGroup,
  TransactionHistoryItem,
} from '@/background/service/transactionHistory';
import { useWallet } from '@/ui/utils';
import {
  customTestnetTokenToTokenItem,
  getTokenSymbol,
} from '@/ui/utils/token';
import { findChain, findChainByID } from '@/utils/chain';
import { getPendingGroupCategory } from '@/utils/tx';
import { CHAINS } from '@debank/common';
import { TokenItem, TxRequest } from '@rabby-wallet/rabby-api/dist/types';
import { useRequest } from 'ahooks';
import { flatten, keyBy } from 'lodash';
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
      const chain = findChain({
        serverId: serverId,
      });
      if (!chain) {
        return;
      }
      if (chain.isTestnet) {
        return wallet.getCustomTestnetTx({
          chainId: chain.id,
          hash,
        });
      } else {
        return wallet.openapi.getTx(serverId, hash, gasPrice);
      }
    },
    {
      cacheKey: `${serverId}-${hash}-${gasPrice}`,
      refreshDeps: [hash, serverId, gasPrice],
    }
  );
};

export const useLoadTxRequests = (
  pendings: TransactionGroup[],
  options?: {
    onSuccess?: (data: Record<string, TxRequest>) => void;
  }
) => {
  const { unbroadcastedTxs, broadcastedTxs } = getPendingGroupCategory(
    pendings
  );
  const list = [...unbroadcastedTxs, ...broadcastedTxs];
  const wallet = useWallet();
  const testnetTxs: TransactionHistoryItem[] = [];
  const mainnetTxs: TransactionHistoryItem[] = [];

  list.forEach((tx) => {
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
      if (!list.length) {
        return {};
      }
      const res = await Promise.all([
        [],
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
      refreshDeps: [list.map((tx) => tx.reqId).join(',')],
      pollingInterval: 1000 * 6,
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
  const chain = findChain({
    id: item.chainId,
  });

  const completedTx = item.txs.find(
    (tx) => tx.isCompleted && !tx.isSubmitFailed && !tx.isWithdrawed
  );

  const nativeToken =
    item.explain?.native_token ||
    (chain
      ? customTestnetTokenToTokenItem({
          id: chain.nativeTokenAddress,
          chainId: chain.id,
          symbol: chain.nativeTokenSymbol,
          decimals: chain.nativeTokenDecimals,
          amount: 0,
          rawAmount: '0',
        })
      : undefined);

  const hasTokenPrice = !!nativeToken;
  const gasTokenCount =
    hasTokenPrice && completedTx
      ? (Number(
          completedTx.rawTx.gasPrice || completedTx.rawTx.maxFeePerGas || 0
        ) *
          (completedTx.gasUsed || 0)) /
        1e18
      : 0;
  const gasUSDValue =
    gasTokenCount && nativeToken
      ? ((nativeToken?.price || 0) * gasTokenCount).toFixed(2)
      : 0;
  const gasTokenSymbol =
    hasTokenPrice && nativeToken ? getTokenSymbol(nativeToken) : '';

  const loadTxData = async () => {
    if (gasTokenCount) {
      return;
    }
    let map: Record<
      string,
      {
        frontTx?: number;
        gasUsed?: number;
        token?: TokenItem;
        tokenCount?: number;
      }
    > = {};
    if (chain && completedTx) {
      const res = chain?.isTestnet
        ? await wallet.getCustomTestnetTx({
            chainId: chain.id,
            hash: completedTx.hash!,
          })
        : await wallet.openapi.getTx(
            chain.serverId,
            completedTx.hash!,
            Number(
              completedTx.rawTx.gasPrice || completedTx.rawTx.maxFeePerGas || 0
            )
          );
      map = {
        ...map,
        [res.hash]: {
          token: res.token,
          tokenCount:
            (res.gas_used *
              Number(
                completedTx!.rawTx.gasPrice ||
                  completedTx!.rawTx.maxFeePerGas ||
                  0
              )) /
            1e18,
          gasUsed: res.gas_used,
        },
      };
      return map;
    }

    const results = chain
      ? await Promise.all(
          item.txs
            .filter((tx) => !tx.isSubmitFailed && !tx.isWithdrawed && tx.hash)
            .map((tx) => {
              if (chain?.isTestnet) {
                return wallet.getCustomTestnetTx({
                  chainId: chain.id,
                  hash: tx.hash!,
                });
              } else {
                return wallet.openapi.getTx(
                  chain.serverId,
                  tx.hash!,
                  Number(tx.rawTx.gasPrice || tx.rawTx.maxFeePerGas || 0)
                );
              }
            })
        )
      : [];

    results.forEach(({ code, status, gas_used, token }, index) => {
      map = {
        ...map,
        [item.txs[index].hash!]: {
          ...map[item.txs[index].hash!],
          gasUsed: gas_used,
          token,
        },
      };
    });
    return map;
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
