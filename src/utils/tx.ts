import {
  TransactionGroup,
  TransactionHistoryItem,
} from '@/background/service/transactionHistory';

const getGasPrice = (tx: TransactionHistoryItem) => {
  return Number(tx.rawTx.gasPrice || tx.rawTx.maxFeePerGas || 0);
};
export const findMaxGasTx = (txs: TransactionHistoryItem[]) => {
  const maxGasTx = txs.reduce((res, tx) => {
    if (tx.isSubmitFailed || tx.isWithdrawed) {
      return res;
    }
    if (getGasPrice(tx) > getGasPrice(res)) {
      return tx;
    } else {
      return res;
    }
  }, txs[0]);

  return maxGasTx;
};

export const checkIsPendingTxGroup = (txGroup: TransactionGroup) => {
  const maxGasTx = findMaxGasTx(txGroup.txs);

  return txGroup.isPending && !txGroup.isSubmitFailed && !maxGasTx.isWithdrawed;
};
