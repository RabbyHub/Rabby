import {
  TransactionGroup,
  TransactionHistoryItem,
} from '@/background/service/transactionHistory';
import { sortBy } from 'lodash';

const getGasPrice = (tx: TransactionHistoryItem) => {
  return Number(tx.rawTx.gasPrice || tx.rawTx.maxFeePerGas || 0);
};
export const findMaxGasTx = (txs: TransactionHistoryItem[]) => {
  const list = sortBy(
    txs,
    (tx) =>
      tx.isSubmitFailed && !tx.isWithdrawed ? 2 : tx.isWithdrawed ? 1 : -1,
    (tx) => -getGasPrice(tx)
  );

  return list[0];
};

export const checkIsPendingTxGroup = (txGroup: TransactionGroup) => {
  const maxGasTx = findMaxGasTx(txGroup.txs);

  const isSubmitFailed = txGroup.isSubmitFailed;

  return txGroup.isPending && !isSubmitFailed && !maxGasTx?.isWithdrawed;
};

export const getPendingGroupCategory = (pendings: TransactionGroup[]) => {
  const txs = pendings.reduce((res, pending) => {
    return res.concat(pending.txs);
  }, [] as TransactionHistoryItem[]);

  const unbroadcastedTxs = txs.filter(
    (tx) => tx && tx.reqId && !tx.hash && !tx.isSubmitFailed && !tx.isWithdrawed
  ) as (TransactionHistoryItem & { reqId: string })[];

  const broadcastedTxs = txs.filter(
    (tx) => tx && tx.hash && !tx.isSubmitFailed && !tx.isWithdrawed
  ) as (TransactionHistoryItem & { hash: string })[];

  return {
    unbroadcastedTxs,
    broadcastedTxs,
  };
};
