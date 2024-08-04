import { isHexString } from 'ethereumjs-util';
import BigNumber from 'bignumber.js';
import {
  CHAINS,
  DEFAULT_GAS_LIMIT_RATIO,
  GASPRICE_RANGE,
  KEYRING_CATEGORY_MAP,
  SAFE_GAS_LIMIT_RATIO,
} from 'consts';
import { ExplainTxResponse, GasLevel, Tx } from 'background/service/openapi';
import { findChain } from './chain';
import { intToHex, WalletControllerType } from '@/ui/utils';
import { Chain } from '@debank/common';
import { TransactionGroup } from '@/background/service/transactionHistory';

export const validateGasPriceRange = (tx: Tx) => {
  const chain = findChain({
    id: tx.chainId,
  });
  if (!chain) return true;
  const range = GASPRICE_RANGE[chain.enum];
  if (!range) return true;
  const [min, max] = range;
  if (Number((tx as Tx).gasPrice || tx.maxFeePerGas) / 1e9 < min)
    throw new Error('GasPrice too low');
  if (Number((tx as Tx).gasPrice || tx.maxFeePerGas) / 1e9 > max)
    throw new Error('GasPrice too high');
  return true;
};

export const convert1559ToLegacy = (tx) => {
  return {
    chainId: tx.chainId,
    from: tx.from,
    to: tx.to,
    value: tx.value,
    data: tx.data,
    gas: tx.gas,
    gasPrice: tx.maxFeePerGas,
    nonce: tx.nonce,
  };
};

export const convertLegacyTo1559 = (tx: Tx) => {
  return {
    chainId: tx.chainId,
    from: tx.from,
    to: tx.to,
    value: tx.value,
    data: tx.data,
    gas: tx.gas,
    maxFeePerGas: tx.gasPrice,
    maxPriorityFeePerGas: tx.gasPrice,
    nonce: tx.nonce,
  };
};

export const is1559Tx = (tx: Tx) => {
  if (!('maxFeePerGas' in tx) || !('maxPriorityFeePerGas' in tx)) return false;
  return isHexString(tx.maxFeePerGas!) && isHexString(tx.maxPriorityFeePerGas!);
};

export function getKRCategoryByType(type?: string) {
  return KEYRING_CATEGORY_MAP[type as any] || null;
}

// return maxPriorityPrice or maxGasPrice
export const calcMaxPriorityFee = (
  gasList: GasLevel[],
  target: GasLevel,
  chainId: number,
  useMaxFee: boolean
) => {
  if (target.priority_price && target.priority_price !== null) {
    return target.priority_price;
  }

  return target.price;
};

export function makeTransactionId(
  fromAddr: string,
  nonce: number | string,
  chainEnum: string
) {
  if (typeof nonce === 'number') {
    nonce = `0x${nonce.toString(16)}`;
  } else if (typeof nonce === 'string') {
    nonce = nonce.startsWith('0x') ? nonce : `0x${nonce}`;
  }
  return `${fromAddr}_${nonce}_${chainEnum}`;
}

interface BlockInfo {
  baseFeePerGas: string;
  difficulty: string;
  extraData: string;
  gasLimit: string;
  gasUsed: string;
  hash: string;
  logsBloom: string;
  miner: string;
  mixHash: string;
  nonce: string;
  number: string;
  parentHash: string;
  receiptsRoot: string;
  sha3Uncles: string;
  size: string;
  stateRoot: string;
  timestamp: string;
  totalDifficulty: string;
  transactions: string[];
  transactionsRoot: string;
  uncles: string[];
}

export async function calcGasLimit({
  chain,
  tx,
  gas,
  selectedGas,
  nativeTokenBalance,
  explainTx,
  needRatio,
  wallet,
}: {
  chain: Chain;
  tx: Tx;
  gas: BigNumber;
  selectedGas: GasLevel | null;
  nativeTokenBalance: string;
  explainTx: ExplainTxResponse;
  needRatio: boolean;
  wallet: WalletControllerType;
}) {
  let block: null | BlockInfo = null;
  try {
    block = await wallet.requestETHRpc<any>(
      {
        method: 'eth_getBlockByNumber',
        params: ['latest', false],
      },
      chain.serverId
    );
  } catch (e) {
    // NOTHING
  }

  // use server response gas limit
  let ratio = SAFE_GAS_LIMIT_RATIO[chain.id] || DEFAULT_GAS_LIMIT_RATIO;
  let sendNativeTokenAmount = new BigNumber(tx.value); // current transaction native token transfer count
  sendNativeTokenAmount = isNaN(sendNativeTokenAmount.toNumber())
    ? new BigNumber(0)
    : sendNativeTokenAmount;
  const gasNotEnough = gas
    .times(ratio)
    .times(selectedGas?.price || 0)
    .div(1e18)
    .plus(sendNativeTokenAmount.div(1e18))
    .isGreaterThan(new BigNumber(nativeTokenBalance).div(1e18));
  if (gasNotEnough) {
    ratio = explainTx.gas.gas_ratio;
  }
  const recommendGasLimitRatio = needRatio ? ratio : 1;
  let recommendGasLimit = needRatio
    ? gas.times(ratio).toFixed(0)
    : gas.toFixed(0);
  if (block && new BigNumber(recommendGasLimit).gt(block.gasLimit)) {
    recommendGasLimit = new BigNumber(block.gasLimit).times(0.95).toFixed(0);
  }
  const gasLimit = intToHex(
    Math.max(Number(recommendGasLimit), Number(tx.gas || 0))
  );

  return {
    gasLimit,
    recommendGasLimitRatio,
  };
}

export const getNativeTokenBalance = async ({
  wallet,
  address,
  chainId,
}: {
  wallet: WalletControllerType;
  address: string;
  chainId: number;
}): Promise<string> => {
  const chain = findChain({
    id: chainId,
  });
  if (!chain) {
    throw new Error('chain not found');
  }
  const balance = await wallet.requestETHRpc<any>(
    {
      method: 'eth_getBalance',
      params: [address, 'latest'],
    },
    chain.serverId
  );
  return balance;
};

export const getPendingTxs = async ({
  recommendNonce,
  wallet,
  address,
}: {
  recommendNonce: string;
  wallet: WalletControllerType;
  address: string;
}) => {
  const { pendings } = await wallet.getTransactionHistory(address);

  return pendings
    .filter((item) => new BigNumber(item.nonce).lt(recommendNonce))
    .reduce((result, item) => {
      return result.concat(item.txs.map((tx) => tx.rawTx));
    }, [] as Tx[])
    .map((item) => ({
      from: item.from,
      to: item.to,
      chainId: item.chainId,
      data: item.data || '0x',
      nonce: item.nonce,
      value: item.value,
      gasPrice: `0x${new BigNumber(
        item.gasPrice || item.maxFeePerGas || 0
      ).toString(16)}`,
      gas: item.gas || item.gasLimit || '0x0',
    }));
};
