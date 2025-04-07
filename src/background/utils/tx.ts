import { decodeFunctionData, erc20Abi, erc721Abi } from 'viem';
import { TransactionHistoryItem } from '../service/transactionHistory';
import { ERC1155ABI } from '@/constant/abi';

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

/**
 * Attempts to decode transaction data using ABIs for three different token standards: ERC20, ERC721, ERC1155.
 * The data will decode correctly if the transaction is an interaction with a contract that matches one of these
 * contract standards
 *
 */
export const parseStandardTokenTransactionData = (data: `0x${string}`) => {
  try {
    return decodeFunctionData({ abi: erc20Abi, data });
  } catch (e) {
    // ignore and next try to parse
  }

  try {
    return decodeFunctionData({ abi: erc721Abi, data });
  } catch (e) {
    // ignore and next try to parse
  }

  try {
    return decodeFunctionData({ abi: ERC1155ABI, data });
  } catch (e) {
    // ignore and next try to parse
  }

  return undefined;
};
