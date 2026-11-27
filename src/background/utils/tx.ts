import { TransactionHistoryItem } from '../service/transactionHistory';

export function formatTxMetaForRpcResult(tx: TransactionHistoryItem) {
  const { hash, rawTx } = tx;
  const {
    to,
    data,
    nonce,
    gas,
    from,
    value,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
    r,
    s,
    v,
  } = rawTx;

  const formattedTxMeta: any = {
    to,
    gas,
    from,
    hash,
    nonce,
    input: data || '0x',
    value: value || '0x0',
    blockHash: null,
    blockNumber: null,
    transactionIndex: null,
    r,
    s,
    v,
  };

  if (maxFeePerGas && maxPriorityFeePerGas) {
    formattedTxMeta.gasPrice = maxFeePerGas;
    formattedTxMeta.maxFeePerGas = maxFeePerGas;
    formattedTxMeta.maxPriorityFeePerGas = maxPriorityFeePerGas;
    formattedTxMeta.type = '0x2';
  } else {
    formattedTxMeta.gasPrice = gasPrice;
    formattedTxMeta.type = '0x0';
  }

  return formattedTxMeta;
}
