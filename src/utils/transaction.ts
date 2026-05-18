import { intToHex, isHexString } from '@ethereumjs/util';
import BigNumber from 'bignumber.js';
import {
  CAN_ESTIMATE_L1_FEE_CHAINS,
  DEFAULT_GAS_LIMIT_BUFFER,
  DEFAULT_GAS_LIMIT_RATIO,
  GASPRICE_RANGE,
  KEYRING_CATEGORY_MAP,
  MINIMUM_GAS_LIMIT,
  SAFE_GAS_LIMIT_BUFFER,
  SAFE_GAS_LIMIT_RATIO,
} from 'consts';
import {
  ExplainTxResponse,
  GasLevel,
  Tx,
  TxPushType,
} from 'background/service/openapi';
import { findChain } from './chain';
import type { WalletControllerType } from '@/ui/utils';
import { Chain } from '@debank/common';
import i18n from '@/i18n';
import { Account } from 'background/service/preference';
import { AuthorizationList, AuthorizationListBytes } from '@ethereumjs/common';
import { TX_GAS_LIMIT_CHAIN_MAPPING } from '@/constant/txGasLimit';
import { getTempoFeeTokenInfo, isTempoChain } from './tempo';

export interface ApprovalRes extends Tx {
  type?: string;
  address?: string;
  uiRequestComponent?: string;
  isSend?: boolean;
  isSpeedUp?: boolean;
  isCancel?: boolean;
  isSwap?: boolean;
  isGnosis?: boolean;
  account?: Account;
  $account?: Account;
  extra?: Record<string, any>;
  traceId?: string;
  $ctx?: any;
  signingTxId?: string;
  pushType?: TxPushType;
  lowGasDeadline?: number;
  reqId?: string;
  isGasLess?: boolean;
  isGasAccount?: boolean;
  logId?: string;
  authorizationList?: AuthorizationListBytes | AuthorizationList | never;
  sig?: string;
}

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

export const is7702Tx = (tx: ApprovalRes) => {
  if ('authorizationList' in tx) {
    if (
      Array.isArray(tx.authorizationList) &&
      tx.authorizationList.length > 0
    ) {
      return true;
    }
  }

  return false;
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
  if (target.priority_price !== null && target.priority_price !== undefined) {
    if (target.priority_price > target.price) {
      return target.price;
    }
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

export interface BlockInfo {
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

const GAS_PRICE_DECIMALS = 18;

const rawAmountToBn = (
  value: string | number | BigNumber | null | undefined
) => {
  if (BigNumber.isBigNumber(value)) {
    return value;
  }
  return new BigNumber(value || 0);
};

const pow10 = (decimals: number) => {
  return new BigNumber(10).pow(Math.max(0, decimals));
};

export const convert18RawToTokenRaw = (
  rawAmountIn18: BigNumber,
  tokenDecimals: number
) => {
  if (tokenDecimals === GAS_PRICE_DECIMALS) {
    return rawAmountIn18;
  }
  if (tokenDecimals > GAS_PRICE_DECIMALS) {
    return rawAmountIn18.times(pow10(tokenDecimals - GAS_PRICE_DECIMALS));
  }
  return rawAmountIn18.div(pow10(GAS_PRICE_DECIMALS - tokenDecimals));
};

const convertRawToTokenAmount = (
  rawAmount: string | number | BigNumber,
  tokenDecimals: number
) => {
  return rawAmountToBn(rawAmount).div(pow10(tokenDecimals));
};

export type GasTokenInfo = {
  tokenId: string;
  symbol: string;
  decimals: number;
  logoUrl?: string;
};

export type GasTokenBalanceInfo = {
  rawBalance: string;
  token: GasTokenInfo;
};

export async function calcGasLimit({
  chain,
  tx,
  gas,
  selectedGas,
  nativeTokenBalance,
  explainTx,
  needRatio,
  wallet,
  preparedBlock,
  gasTokenDecimals = GAS_PRICE_DECIMALS,
  checkTxValueInBalance = true,
}: {
  chain: Chain;
  tx: Tx;
  gas: BigNumber;
  selectedGas: GasLevel | null;
  nativeTokenBalance: string;
  explainTx: ExplainTxResponse;
  needRatio: boolean;
  wallet: WalletControllerType;
  preparedBlock?: BlockInfo | Promise<BlockInfo | null>;
  gasTokenDecimals?: number;
  checkTxValueInBalance?: boolean;
}) {
  let block: null | BlockInfo = null;
  try {
    block = preparedBlock ? await preparedBlock : null;
  } catch (error) {
    // NOTHING
  }
  try {
    if (!block) {
      block = await wallet.requestETHRpc<BlockInfo>(
        {
          method: 'eth_getBlockByNumber',
          params: ['latest', false],
        },
        chain.serverId
      );
    }
  } catch (e) {
    // NOTHING
  }

  // use server response gas limit
  let ratio = SAFE_GAS_LIMIT_RATIO[chain.id] || DEFAULT_GAS_LIMIT_RATIO;
  const sendNativeTokenAmount = checkTxValueInBalance
    ? rawAmountToBn(tx.value || 0).div(1e18)
    : new BigNumber(0);
  const gasTokenBalanceAmount = convertRawToTokenAmount(
    nativeTokenBalance,
    gasTokenDecimals
  );
  const gasNotEnough = gas
    .times(ratio)
    .times(selectedGas?.price || 0)
    .div(1e18)
    .plus(sendNativeTokenAmount)
    .isGreaterThan(gasTokenBalanceAmount);
  if (gasNotEnough) {
    ratio = explainTx.gas.gas_ratio;
  }
  const recommendGasLimitRatio = needRatio ? ratio : 1;
  let recommendGasLimit = needRatio
    ? gas.times(ratio).toFixed(0)
    : gas.toFixed(0);
  const blockGasRatio = SAFE_GAS_LIMIT_BUFFER[chain.id] || 1;
  if (
    block &&
    new BigNumber(block.gasLimit).times(blockGasRatio).lt(recommendGasLimit)
  ) {
    const buffer = SAFE_GAS_LIMIT_BUFFER[chain.id] || DEFAULT_GAS_LIMIT_BUFFER;
    recommendGasLimit = new BigNumber(block.gasLimit).times(buffer).toFixed(0);
  }

  const singleTxGasLimit =
    TX_GAS_LIMIT_CHAIN_MAPPING[chain.enum] || Number(recommendGasLimit);

  recommendGasLimit =
    Number(recommendGasLimit) > singleTxGasLimit
      ? singleTxGasLimit + ''
      : recommendGasLimit;

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
  const gasToken = await getGasTokenBalance({
    wallet,
    address,
    chainId,
  });
  return gasToken.rawBalance;
};

export const getGasTokenBalance = async ({
  wallet,
  address,
  chainId,
}: {
  wallet: WalletControllerType;
  address: string;
  chainId: number;
}): Promise<GasTokenBalanceInfo> => {
  const chain = findChain({
    id: chainId,
  });
  if (!chain) {
    throw new Error('chain not found');
  }
  if (isTempoChain(chain.serverId)) {
    const feeToken = await getTempoFeeTokenInfo({
      wallet,
      userAddress: address,
      chainServerId: chain.serverId,
    });
    return {
      rawBalance: rawAmountToBn(feeToken.rawBalanceHex || 0).toFixed(0),
      token: {
        tokenId: feeToken.tokenId,
        symbol: feeToken.symbol,
        decimals: feeToken.decimals,
        logoUrl: feeToken.logoUrl,
      },
    };
  }

  const balance = await wallet.requestETHRpc<any>(
    {
      method: 'eth_getBalance',
      params: [address, 'latest'],
    },
    chain.serverId
  );
  return {
    rawBalance: rawAmountToBn(balance || 0).toFixed(0),
    token: {
      tokenId: chain.nativeTokenAddress,
      symbol: chain.nativeTokenSymbol,
      decimals: chain.nativeTokenDecimals || GAS_PRICE_DECIMALS,
      logoUrl: chain.nativeTokenLogo,
    },
  };
};

export const getPendingTxs = async ({
  recommendNonce,
  wallet,
  address,
  chainId,
}: {
  recommendNonce: string;
  wallet: WalletControllerType;
  address: string;
  chainId: number;
}) => {
  const { pendings } = await wallet.getTransactionHistory(address);

  return pendings
    .filter((item) => new BigNumber(item.nonce).lt(recommendNonce))
    .reduce((result, item) => {
      return result.concat(item.txs.map((tx) => tx.rawTx));
    }, [] as Tx[])
    .filter((item) => item.chainId === chainId)
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

export const explainGas = async ({
  gasUsed,
  gasPrice,
  chainId,
  nativeTokenPrice,
  tx,
  wallet,
  gasLimit,
  account,
  preparedL1Fee,
  gasTokenDecimals = GAS_PRICE_DECIMALS,
}: {
  gasUsed: number | string;
  gasPrice: number | string;
  chainId: number;
  nativeTokenPrice: number;
  tx: Tx;
  wallet: WalletControllerType;
  gasLimit: string | undefined;
  account: Account;
  preparedL1Fee?: string | Promise<string>;
  gasTokenDecimals?: number;
}) => {
  let gasCostRawAmountIn18 = rawAmountToBn(gasUsed).times(gasPrice);
  let maxGasCostRawAmountIn18 = rawAmountToBn(gasLimit || 0).times(gasPrice);
  let gasCostTokenAmount = gasCostRawAmountIn18.div(1e18);
  let maxGasCostAmount = maxGasCostRawAmountIn18.div(1e18);
  const chain = findChain({
    id: chainId,
  });
  if (!chain) throw new Error(`${chainId} is not found in supported chains`);
  if (CAN_ESTIMATE_L1_FEE_CHAINS.includes(chain.enum)) {
    let res =
      typeof preparedL1Fee === 'object' && 'then' in preparedL1Fee
        ? await preparedL1Fee
        : preparedL1Fee || undefined;
    if (!res) {
      res = await wallet.fetchEstimatedL1Fee(
        {
          txParams: tx,
        },
        chain.enum,
        account
      );
    }
    gasCostRawAmountIn18 = gasCostRawAmountIn18.plus(rawAmountToBn(res));
    maxGasCostRawAmountIn18 = maxGasCostRawAmountIn18.plus(rawAmountToBn(res));
    gasCostTokenAmount = gasCostRawAmountIn18.div(1e18);
    maxGasCostAmount = maxGasCostRawAmountIn18.div(1e18);
  }
  const gasCostUsd = new BigNumber(gasCostTokenAmount).times(
    isTempoChain(chain.serverId) ? 1 : nativeTokenPrice
  );

  const gasCostRawAmount = convert18RawToTokenRaw(
    gasCostRawAmountIn18,
    gasTokenDecimals
  );
  const maxGasCostRawAmount = convert18RawToTokenRaw(
    maxGasCostRawAmountIn18,
    gasTokenDecimals
  );
  return {
    gasCostUsd,
    gasCostAmount: gasCostTokenAmount,
    maxGasCostAmount,
    gasCostRawAmount,
    maxGasCostRawAmount,
  };
};

export const checkGasAndNonce = ({
  recommendGasLimitRatio,
  recommendGasLimit,
  recommendNonce,
  tx,
  gasLimit,
  nonce,
  isCancel,
  gasExplainResponse,
  isSpeedUp,
  isGnosisAccount,
  nativeTokenBalance,
  gasTokenDecimals = GAS_PRICE_DECIMALS,
  gasTokenId,
  tempoPreferredFeeTokenId,
  checkTxValueInBalance = true,
}: {
  recommendGasLimitRatio: number;
  nativeTokenBalance: string;
  recommendGasLimit: number | string | BigNumber;
  recommendNonce: number | string | BigNumber;
  tx: Tx;
  gasLimit: number | string | BigNumber;
  nonce: number | string | BigNumber;
  gasExplainResponse: {
    isExplainingGas?: boolean;
    gasCostUsd: BigNumber;
    gasCostAmount: BigNumber;
    maxGasCostAmount: BigNumber;
    gasCostRawAmount?: BigNumber;
    maxGasCostRawAmount?: BigNumber;
  };
  isCancel: boolean;
  isSpeedUp: boolean;
  isGnosisAccount: boolean;
  gasTokenDecimals?: number;
  gasTokenId?: string;
  tempoPreferredFeeTokenId?: string;
  checkTxValueInBalance?: boolean;
}) => {
  const errors: {
    code: number;
    msg: string;
    level?: 'warn' | 'danger' | 'forbidden';
  }[] = [];
  if (!isGnosisAccount && new BigNumber(gasLimit).lt(MINIMUM_GAS_LIMIT)) {
    errors.push({
      code: 3006,
      msg: i18n.t('page.signTx.gasLimitNotEnough'),
      level: 'forbidden',
    });
  }
  if (
    !isGnosisAccount &&
    new BigNumber(gasLimit).lt(
      new BigNumber(recommendGasLimit).times(recommendGasLimitRatio)
    ) &&
    new BigNumber(gasLimit).gte(21000)
  ) {
    if (recommendGasLimitRatio === DEFAULT_GAS_LIMIT_RATIO) {
      const realRatio = new BigNumber(gasLimit).div(recommendGasLimit);
      if (realRatio.lt(DEFAULT_GAS_LIMIT_RATIO) && realRatio.gt(1)) {
        errors.push({
          code: 3004,
          msg: i18n.t('page.signTx.gasLimitLessThanExpect'),
          level: 'warn',
        });
      } else if (realRatio.lt(1)) {
        errors.push({
          code: 3005,
          msg: i18n.t('page.signTx.gasLimitLessThanGasUsed'),
          level: 'danger',
        });
      }
    } else {
      if (new BigNumber(gasLimit).lt(recommendGasLimit)) {
        errors.push({
          code: 3004,
          msg: i18n.t('page.signTx.gasLimitLessThanExpect'),
          level: 'warn',
        });
      }
    }
  }
  const balanceRawAmount = rawAmountToBn(nativeTokenBalance || 0);
  const sendNativeTokenRawAmount = checkTxValueInBalance
    ? convert18RawToTokenRaw(rawAmountToBn(tx.value || 0), gasTokenDecimals)
    : new BigNumber(0);
  const maxGasCostRawAmount =
    gasExplainResponse.maxGasCostRawAmount ||
    rawAmountToBn(gasExplainResponse.maxGasCostAmount).times(
      pow10(gasTokenDecimals)
    );
  const chain = findChain({
    id: tx.chainId,
  });
  const tempoFeeToken =
    (tx as Tx & { feeToken?: string }).feeToken || tempoPreferredFeeTokenId;
  // Tempo gas token options are pre-filtered by gas affordability. If the
  // transaction feeToken cannot be selected as the current gas token, treat it
  // as the same 3001 gas-not-enough condition so Gas Account auto-switching
  // stays centralized in this check.
  const tempoFeeTokenBalanceInsufficient =
    !!chain &&
    isTempoChain(chain.serverId) &&
    !!tempoFeeToken &&
    !!gasTokenId &&
    tempoFeeToken.toLowerCase() !== gasTokenId.toLowerCase();

  if (
    !isGnosisAccount &&
    (tempoFeeTokenBalanceInsufficient ||
      maxGasCostRawAmount
        .plus(sendNativeTokenRawAmount)
        .isGreaterThan(balanceRawAmount))
  ) {
    errors.push({
      code: 3001,
      msg: i18n.t('page.signTx.nativeTokenNotEngouthForGas'),
      level: 'forbidden',
    });
  }
  if (new BigNumber(nonce).lt(recommendNonce) && !(isCancel || isSpeedUp)) {
    errors.push({
      code: 3003,
      msg: i18n.t('page.signTx.nonceLowerThanExpect', [
        new BigNumber(recommendNonce),
      ]),
    });
  }
  return errors;
};
