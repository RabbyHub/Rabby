import {
  TEMPO_CHAIN_SERVER_ID,
  TEMPO_FEE_MANAGER_ADDRESS,
  TEMPO_FEE_TOKEN_DECIMALS,
  TEMPO_PATH_USD_TOKEN,
} from '@/constant/tempo';
import { KEYRING_TYPE } from 'consts';
import type { WalletControllerType } from '@/ui/utils';
import type { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import {
  decodeFunctionResult,
  encodeFunctionData,
  isAddress,
  toHex,
} from 'viem';
import BigNumber from 'bignumber.js';

const FEE_MANAGER_READ_METHODS = [
  'userTokens',
  'getUserToken',
  'userToken',
  'getUserFeeToken',
  'userFeeToken',
] as const;

const userTokenAbi = [
  {
    name: 'getUserToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

const erc20BalanceOfAbi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const erc20DecimalsAbi = [
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

const erc20SymbolAbi = [
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

const isSameTokenId = (a?: string | null, b?: string | null) => {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TEMPO_FEE_TOKEN_WHITELIST = [
  {
    tokenId: '0x20C000000000000000000000b9537d11c60E8b50',
    symbol: 'USDC.e',
  },
  {
    tokenId: '0x20C00000000000000000000014f22CA97301EB73',
    symbol: 'USDT0',
  },
  {
    tokenId: '0x20C0000000000000000000000000000000000000',
    symbol: 'pathUSD',
  },
  {
    tokenId: '0x20C0000000000000000000000520792DcCccCccC',
    symbol: 'cUSD',
  },
  {
    tokenId: '0x20C0000000000000000000003554d28269E0f3c2',
    symbol: 'frxUSD',
  },
] as const;
const TEMPO_FEE_TOKEN_WHITELIST_MAP = new Map(
  TEMPO_FEE_TOKEN_WHITELIST.map((item) => [item.tokenId.toLowerCase(), item])
);

const normalizeChainServerId = (chainServerId?: string | null) =>
  (chainServerId || '').toLowerCase();

const toBigNumberFromValue = (value: unknown) => {
  if (BigNumber.isBigNumber(value)) return value;
  if (value === null || typeof value === 'undefined') return new BigNumber(0);
  if (typeof value === 'bigint') return new BigNumber(value.toString());
  if (typeof value === 'number') return new BigNumber(value);
  if (typeof value === 'string') {
    if (!value.trim()) return new BigNumber(0);
    if (value.startsWith('0x') || value.startsWith('0X')) {
      return new BigNumber(BigInt(value).toString());
    }
    return new BigNumber(value);
  }
  return new BigNumber(0);
};

const convert18RawToTokenRaw = (
  rawAmountIn18: BigNumber,
  tokenDecimals: number
) => {
  if (tokenDecimals === 18) {
    return rawAmountIn18;
  }
  const pow10 = new BigNumber(10).pow(Math.abs(tokenDecimals - 18));
  if (tokenDecimals > 18) {
    return rawAmountIn18.times(pow10);
  }
  return rawAmountIn18.div(pow10);
};

export const isTempoChain = (chainServerId?: string | null) => {
  const normalized = normalizeChainServerId(chainServerId);
  const base = normalizeChainServerId(TEMPO_CHAIN_SERVER_ID);
  return normalized === base;
};

export const calcTempoMaxGasCostRawAmountIn18 = (
  txs: Array<
    Partial<{
      gas?: string | number;
      gasLimit?: string | number;
      gasPrice?: string | number;
      maxFeePerGas?: string | number;
    }>
  >
) => {
  return txs.reduce((sum, tx) => {
    const gas = toBigNumberFromValue(tx.gas ?? tx.gasLimit);
    const gasPrice = toBigNumberFromValue(tx.maxFeePerGas ?? tx.gasPrice);
    if (!gas.isFinite() || !gasPrice.isFinite()) {
      return sum;
    }
    if (gas.lte(0) || gasPrice.lte(0)) {
      return sum;
    }
    return sum.plus(gas.times(gasPrice));
  }, new BigNumber(0));
};

export type TempoTxCall = {
  to?: string;
  data?: string;
  value?: string;
};

export type TempoTxExtras = {
  type?: string | number;
  calls?: Array<{
    to?: unknown;
    data?: unknown;
    value?: unknown;
  }>;
  feeToken?: unknown;
  feePayer?: boolean;
  feePayerSignature?: unknown;
  nonceKey?: unknown;
  keyAuthorization?: unknown;
  validBefore?: unknown;
  validAfter?: unknown;
};

export type TxWithTempoExtras<T extends object = Record<string, unknown>> = T &
  TempoTxExtras;

export type TempoTxLike = {
  type?: string | number;
  to?: string;
  data?: string;
  value?: string | number | bigint;
  calls?: TempoTxExtras['calls'];
} & object;

export type TempoFeeTokenInfo = {
  tokenId: string;
  symbol: string;
  decimals: number;
  logoUrl: string;
  rawBalanceHex: string;
};

export type TempoFeeTokenOption = TokenItem & {
  isDisabledByTempoGasBalance?: boolean;
};

const normalizeHexValue = (value?: string | number | bigint) => {
  if (typeof value === 'number' || typeof value === 'bigint') {
    return toHex(value);
  }
  if (value === '0x' || value === '0X') return '0x0';
  return value;
};

export const isTempoTxType = (type: unknown) => {
  if (type === 118 || type === '0x76' || type === '0X76') return true;
  return typeof type === 'string' && type.toLowerCase() === 'tempo';
};

const hasTempoFieldValue = (value: unknown) =>
  typeof value !== 'undefined' &&
  value !== null &&
  !(typeof value === 'string' && value.trim() === '');

export const hasValidTempoFeePayerSignature = (sig: unknown) => {
  if (typeof sig === 'string') return sig.length > 0;
  if (!sig || typeof sig !== 'object') return false;
  const typedSig = sig as {
    r?: unknown;
    s?: unknown;
    yParity?: unknown;
    v?: unknown;
  };
  return (
    hasTempoFieldValue(typedSig.r) &&
    hasTempoFieldValue(typedSig.s) &&
    (hasTempoFieldValue(typedSig.yParity) || hasTempoFieldValue(typedSig.v))
  );
};

export const hasValidTempoCalls = (calls: unknown) => {
  if (!Array.isArray(calls) || calls.length === 0) return false;
  return calls.every((call) => {
    if (!call || typeof call !== 'object') return false;
    const typedCall = call as {
      to?: unknown;
      data?: unknown;
      value?: unknown;
    };
    return (
      (!hasTempoFieldValue(typedCall.to) || typeof typedCall.to === 'string') &&
      (!hasTempoFieldValue(typedCall.data) ||
        typeof typedCall.data === 'string') &&
      (!hasTempoFieldValue(typedCall.value) ||
        typeof typedCall.value === 'string' ||
        typeof typedCall.value === 'number' ||
        typeof typedCall.value === 'bigint')
    );
  });
};

export const isTempoSpecialTransaction = <T extends Record<string, unknown>>(
  tx: T
) => {
  if (isTempoTxType(tx.type)) return true;
  if (hasValidTempoCalls(tx.calls)) return true;
  if (hasValidTempoFeePayerSignature(tx.feePayerSignature)) return true;
  if (hasTempoFieldValue(tx.feeToken)) return true;
  if (hasTempoFieldValue(tx.nonceKey)) return true;
  if (hasTempoFieldValue(tx.keyAuthorization)) return true;
  if (hasTempoFieldValue(tx.validBefore)) return true;
  if (hasTempoFieldValue(tx.validAfter)) return true;
  return false;
};

export const shouldUseTempoTransaction = (params: {
  tx: Record<string, unknown>;
  chainServerId?: string | null;
  isGasAccount?: boolean;
  accountType?: string | null;
}) => {
  const { tx, chainServerId, isGasAccount, accountType } = params;
  if (!isTempoChain(chainServerId)) return false;
  if (isGasAccount) return isTempoBatchSupportedAccountType(accountType);
  return isTempoSpecialTransaction(tx);
};

export const getTxMatchData = (
  tx?: Partial<
    TempoTxLike & {
      calls?: Array<{
        data?: unknown;
      }>;
    }
  > | null
) => {
  if (typeof tx?.data === 'string' && tx.data) {
    return tx.data;
  }

  if (Array.isArray(tx?.calls) && tx.calls.length) {
    const lastCall = tx.calls[tx.calls.length - 1];
    if (typeof lastCall?.data === 'string' && lastCall.data) {
      return lastCall.data;
    }
  }

  return '0x';
};

export const isTempoBatchSupportedAccountType = (type?: string | null) => {
  return type === KEYRING_TYPE.SimpleKeyring || type === KEYRING_TYPE.HdKeyring;
};

export const shouldUseTempoBatchTransaction = (params: {
  chainServerId?: string | null;
  accountType?: string | null;
  txs?: TempoTxLike[];
  txCount?: number;
}) => {
  const { chainServerId, accountType, txs, txCount } = params;
  if (!isTempoChain(chainServerId)) return false;
  if (!isTempoBatchSupportedAccountType(accountType)) return false;
  const count = Array.isArray(txs) ? txs.length : txCount || 0;
  return count > 1;
};

const normalizeCall = (
  call: NonNullable<TempoTxExtras['calls']>[number],
  topLevel: TempoTxLike
): TempoTxCall => {
  const nextCall: TempoTxCall = {
    to: typeof call.to === 'string' ? call.to : topLevel.to,
    data: typeof call.data === 'string' ? call.data : topLevel.data,
    value: normalizeHexValue(
      typeof call.value === 'string'
        ? call.value
        : typeof call.value === 'number' || typeof call.value === 'bigint'
        ? toHex(call.value)
        : typeof topLevel.value === 'string'
        ? topLevel.value
        : typeof topLevel.value === 'number' ||
          typeof topLevel.value === 'bigint'
        ? toHex(topLevel.value)
        : '0x0'
    ),
  };

  if (nextCall.data === '') {
    delete nextCall.data;
  }
  if (!nextCall.to) {
    delete nextCall.to;
  }
  if (!nextCall.data) {
    delete nextCall.data;
  }

  return nextCall;
};

export const toTempoCallsTx = <T extends TempoTxLike>(
  tx: T,
  options?: {
    stripTopLevelData?: boolean;
  }
) => {
  const nextTx: TempoTxLike = {
    ...tx,
    type: tx.type || '0x76',
    value: normalizeHexValue(tx.value),
  };

  if (Array.isArray(nextTx.calls) && nextTx.calls.length > 0) {
    nextTx.calls = nextTx.calls.map((call) =>
      normalizeCall(call || {}, nextTx)
    );
  } else {
    nextTx.calls = [normalizeCall({}, nextTx)];
  }

  if (options?.stripTopLevelData) {
    delete nextTx.data;
  }
  delete nextTx.to;
  delete nextTx.value;

  return nextTx as T;
};

export const buildTempoTransaction = <T extends TxWithTempoExtras<TempoTxLike>>(
  tx: T,
  options?: {
    stripTopLevelData?: boolean;
    feePayer?: boolean;
    forceTempoType?: boolean;
  }
) => {
  const nextTx = {
    ...tx,
    type:
      options?.forceTempoType === false
        ? tx.type
        : isTempoTxType(tx.type)
        ? tx.type
        : '0x76',
    calls: tx.calls,
    feeToken: tx.feeToken,
    nonceKey: tx.nonceKey,
    keyAuthorization: tx.keyAuthorization,
    validBefore: tx.validBefore,
    validAfter: tx.validAfter,
    feePayerSignature:
      tx.feePayerSignature === null ? undefined : tx.feePayerSignature,
    feePayer: options?.feePayer ? true : tx.feePayer,
  } as T;
  return toTempoCallsTx(nextTx, {
    stripTopLevelData: options?.stripTopLevelData ?? true,
  });
};

export const buildTempoBatchTransaction = <
  T extends TxWithTempoExtras<TempoTxLike>
>(
  txs: T[],
  options?: {
    stripTopLevelData?: boolean;
  }
) => {
  if (!txs.length) {
    throw new Error('tempo batch transaction requires at least one tx');
  }

  const baseTx = txs[txs.length - 1];
  return buildTempoTransaction(
    {
      ...baseTx,
      calls: txs.map((tx) => ({
        to: tx.to,
        data: tx.data,
        value: normalizeHexValue(tx.value ?? '0x0'),
      })),
    } as T,
    {
      stripTopLevelData: options?.stripTopLevelData ?? false,
    }
  );
};

export const resolveTempoDefaultTokenId = (params: {
  chainServerId?: string | null;
  tokenId?: string | null;
  nativeTokenId?: string | null;
}) => {
  const { chainServerId, tokenId, nativeTokenId } = params;
  if (!isTempoChain(chainServerId)) {
    return tokenId || nativeTokenId || '';
  }

  if (
    !tokenId ||
    isSameTokenId(tokenId, nativeTokenId) ||
    tokenId.toLowerCase() === normalizeChainServerId(chainServerId)
  ) {
    return TEMPO_PATH_USD_TOKEN;
  }

  return tokenId;
};

const readAddressByMethod = async (params: {
  wallet: WalletControllerType;
  userAddress: string;
  chainServerId: string;
  functionName: typeof FEE_MANAGER_READ_METHODS[number];
}) => {
  const { wallet, userAddress, chainServerId, functionName } = params;
  const methodAbi = [{ ...userTokenAbi[0], name: functionName }] as const;
  const data = encodeFunctionData({
    abi: methodAbi,
    functionName,
    args: [userAddress as `0x${string}`],
  });

  const hex = await wallet.requestETHRpc<string>(
    {
      method: 'eth_call',
      params: [
        {
          to: TEMPO_FEE_MANAGER_ADDRESS,
          data,
        },
        'latest',
      ],
    },
    chainServerId
  );

  const decoded = decodeFunctionResult({
    abi: methodAbi,
    functionName,
    data: hex as `0x${string}`,
  });

  if (!decoded || typeof decoded !== 'string') return null;
  if (!isAddress(decoded)) return null;
  if (isSameTokenId(decoded, ZERO_ADDRESS)) return null;

  return decoded;
};

export const getTempoFeeTokenAddress = async (params: {
  wallet: WalletControllerType;
  userAddress?: string | null;
  chainServerId?: string | null;
}) => {
  const { wallet, userAddress, chainServerId } = params;
  const targetServerId = chainServerId || TEMPO_CHAIN_SERVER_ID;
  if (!userAddress || !isAddress(userAddress)) {
    return TEMPO_PATH_USD_TOKEN;
  }

  for (const functionName of FEE_MANAGER_READ_METHODS) {
    try {
      const tokenAddress = await readAddressByMethod({
        wallet,
        userAddress,
        chainServerId: targetServerId,
        functionName,
      });
      if (tokenAddress) {
        return tokenAddress.toLowerCase();
      }
    } catch {
      // try next selector
    }
  }

  return TEMPO_PATH_USD_TOKEN;
};

const readErc20Balance = async (params: {
  wallet: WalletControllerType;
  tokenAddress: string;
  userAddress: string;
  chainServerId: string;
}) => {
  const { wallet, tokenAddress, userAddress, chainServerId } = params;
  if (!isAddress(tokenAddress) || !isAddress(userAddress)) return '0x0';

  const data = encodeFunctionData({
    abi: erc20BalanceOfAbi,
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
  });

  const hex = await wallet.requestETHRpc<string>(
    {
      method: 'eth_call',
      params: [
        {
          to: tokenAddress,
          data,
        },
        'latest',
      ],
    },
    chainServerId
  );

  const decoded = decodeFunctionResult({
    abi: erc20BalanceOfAbi,
    functionName: 'balanceOf',
    data: hex as `0x${string}`,
  }) as bigint;

  return toHex(decoded || 0n);
};

const readErc20Decimals = async (params: {
  wallet: WalletControllerType;
  tokenAddress: string;
  chainServerId: string;
}) => {
  const { wallet, tokenAddress, chainServerId } = params;
  if (!isAddress(tokenAddress)) return TEMPO_FEE_TOKEN_DECIMALS;

  try {
    const data = encodeFunctionData({
      abi: erc20DecimalsAbi,
      functionName: 'decimals',
    });
    const hex = await wallet.requestETHRpc<string>(
      {
        method: 'eth_call',
        params: [
          {
            to: tokenAddress,
            data,
          },
          'latest',
        ],
      },
      chainServerId
    );
    const decoded = decodeFunctionResult({
      abi: erc20DecimalsAbi,
      functionName: 'decimals',
      data: hex as `0x${string}`,
    }) as number;
    return Number.isFinite(decoded) ? decoded : TEMPO_FEE_TOKEN_DECIMALS;
  } catch {
    return TEMPO_FEE_TOKEN_DECIMALS;
  }
};

const readErc20Symbol = async (params: {
  wallet: WalletControllerType;
  tokenAddress: string;
  chainServerId: string;
}) => {
  const { wallet, tokenAddress, chainServerId } = params;
  if (!isAddress(tokenAddress)) return null;

  try {
    const data = encodeFunctionData({
      abi: erc20SymbolAbi,
      functionName: 'symbol',
    });
    const hex = await wallet.requestETHRpc<string>(
      {
        method: 'eth_call',
        params: [
          {
            to: tokenAddress,
            data,
          },
          'latest',
        ],
      },
      chainServerId
    );
    const decoded = decodeFunctionResult({
      abi: erc20SymbolAbi,
      functionName: 'symbol',
      data: hex as `0x${string}`,
    }) as string;
    return decoded || null;
  } catch {
    return null;
  }
};

export const getTempoFeeTokenInfo = async (params: {
  wallet: WalletControllerType;
  userAddress?: string | null;
  chainServerId?: string | null;
}): Promise<TempoFeeTokenInfo> => {
  const { wallet, userAddress, chainServerId } = params;
  const targetServerId = chainServerId || TEMPO_CHAIN_SERVER_ID;
  const tokenId = await getTempoFeeTokenAddress({
    wallet,
    userAddress,
    chainServerId: targetServerId,
  });
  let token: TokenItem | null = null;

  if (userAddress) {
    try {
      token = await wallet.openapi.getToken(
        userAddress,
        targetServerId,
        tokenId
      );
    } catch {
      token = null;
    }
  }

  let rawBalanceHex = token?.raw_amount_hex_str || '';
  if (!rawBalanceHex && userAddress) {
    rawBalanceHex = await readErc20Balance({
      wallet,
      tokenAddress: tokenId,
      userAddress,
      chainServerId: targetServerId,
    });
  }
  if (!rawBalanceHex) {
    rawBalanceHex = '0x0';
  }

  const decimals =
    token?.decimals ??
    (await readErc20Decimals({
      wallet,
      tokenAddress: tokenId,
      chainServerId: targetServerId,
    }));

  const symbol =
    token?.display_symbol ||
    token?.symbol ||
    (await readErc20Symbol({
      wallet,
      tokenAddress: tokenId,
      chainServerId: targetServerId,
    })) ||
    (isSameTokenId(tokenId, TEMPO_PATH_USD_TOKEN) ? 'pathUSD' : 'USD');

  return {
    tokenId,
    symbol,
    decimals,
    logoUrl: token?.logo_url || '',
    rawBalanceHex,
  };
};

const createTempoTokenItem = (params: {
  tokenId: string;
  symbol?: string;
  decimals?: number;
  logoUrl?: string;
  rawAmountHex?: string;
  usdValue?: number;
  chainServerId?: string;
}): TokenItem => {
  const {
    tokenId,
    symbol,
    decimals,
    logoUrl,
    rawAmountHex,
    usdValue,
    chainServerId,
  } = params;
  const normalizedRawAmountHex = rawAmountHex || '0x0';
  const normalizedRawAmount = toBigNumberFromValue(normalizedRawAmountHex);
  const normalizedSymbol = symbol || '';
  const tokenDecimals = decimals ?? TEMPO_FEE_TOKEN_DECIMALS;
  const normalizedAmount = normalizedRawAmount.div(
    new BigNumber(10).pow(tokenDecimals)
  );
  return {
    amount: normalizedAmount.isFinite() ? normalizedAmount.toNumber() : 0,
    chain: chainServerId || TEMPO_CHAIN_SERVER_ID,
    decimals: tokenDecimals,
    display_symbol: normalizedSymbol,
    id: tokenId,
    is_core: false,
    is_verified: true,
    is_wallet: true,
    logo_url: logoUrl || '',
    name: normalizedSymbol,
    optimized_symbol: normalizedSymbol,
    price: 0,
    symbol: normalizedSymbol,
    time_at: 0,
    usd_value: Number.isFinite(usdValue) ? usdValue : 0,
    raw_amount: normalizedRawAmount.toFixed(0),
    raw_amount_hex_str: normalizedRawAmount.toFixed(0),
  };
};

const mapTokenToTempoFeeTokenOption = (
  token: TokenItem,
  chainServerId: string,
  fallbackSymbol?: string
): TokenItem => {
  const amount = Number(token.amount || 0);
  const usdValue = Number(token.usd_value || amount * Number(token.price || 0));
  const tokenId = token.id || '';
  if (!tokenId) {
    return createTempoTokenItem({
      tokenId: '',
      symbol: fallbackSymbol,
      chainServerId,
    });
  }
  const white = TEMPO_FEE_TOKEN_WHITELIST_MAP.get(tokenId.toLowerCase());

  return createTempoTokenItem({
    tokenId,
    symbol:
      fallbackSymbol ||
      white?.symbol ||
      token.display_symbol ||
      token.symbol ||
      '',
    decimals: token.decimals || TEMPO_FEE_TOKEN_DECIMALS,
    logoUrl: token.logo_url || '',
    rawAmountHex: token.raw_amount_hex_str || '0x0',
    usdValue: Number.isFinite(usdValue) ? usdValue : 0,
    chainServerId,
  });
};

const isTempoFeeTokenBalanceEnoughForGas = (
  token: TokenItem,
  params: {
    maxGasCostRawAmountIn18?: string | number | BigNumber;
    maxGasCostRawAmount?: string | number | BigNumber;
    maxGasCostRawAmountDecimals?: number;
  }
) => {
  const {
    maxGasCostRawAmountIn18,
    maxGasCostRawAmount,
    maxGasCostRawAmountDecimals,
  } = params;
  const requiredRawIn18 = toBigNumberFromValue(maxGasCostRawAmountIn18);
  const requiredRaw = toBigNumberFromValue(maxGasCostRawAmount);
  const balanceRaw = toBigNumberFromValue(token.raw_amount_hex_str || 0);

  if (requiredRaw.gt(0)) {
    const baseDecimals =
      typeof maxGasCostRawAmountDecimals === 'number'
        ? maxGasCostRawAmountDecimals
        : TEMPO_FEE_TOKEN_DECIMALS;
    const tokenDecimals = token.decimals ?? TEMPO_FEE_TOKEN_DECIMALS;
    let requiredByRaw = requiredRaw;
    if (baseDecimals > tokenDecimals) {
      requiredByRaw = requiredRaw.div(
        new BigNumber(10).pow(baseDecimals - tokenDecimals)
      );
    } else if (baseDecimals < tokenDecimals) {
      requiredByRaw = requiredRaw.times(
        new BigNumber(10).pow(tokenDecimals - baseDecimals)
      );
    }
    return balanceRaw.gte(requiredByRaw);
  }

  if (requiredRawIn18.lte(0)) return true;
  const requiredByRawIn18 = convert18RawToTokenRaw(
    requiredRawIn18,
    token.decimals ?? TEMPO_FEE_TOKEN_DECIMALS
  );
  return balanceRaw.gte(requiredByRawIn18);
};

const markTempoFeeTokenOptionsByGas = (
  options: TokenItem[],
  params: {
    maxGasCostRawAmountIn18?: string | number | BigNumber;
    maxGasCostRawAmount?: string | number | BigNumber;
    maxGasCostRawAmountDecimals?: number;
  }
): TempoFeeTokenOption[] => {
  return options
    .map((token) => ({
      ...token,
      isDisabledByTempoGasBalance: !isTempoFeeTokenBalanceEnoughForGas(
        token,
        params
      ),
    }))
    .sort((a, b) => {
      if (a.isDisabledByTempoGasBalance !== b.isDisabledByTempoGasBalance) {
        return a.isDisabledByTempoGasBalance ? 1 : -1;
      }
      return (b.usd_value || 0) - (a.usd_value || 0);
    });
};

export const listTempoFeeTokenOptionsFromCache = (params: {
  tokenList?: TokenItem[];
  chainServerId?: string | null;
  maxGasCostRawAmountIn18?: string | number | BigNumber;
  maxGasCostRawAmount?: string | number | BigNumber;
  maxGasCostRawAmountDecimals?: number;
}) => {
  const {
    tokenList = [],
    chainServerId,
    maxGasCostRawAmountIn18,
    maxGasCostRawAmount,
    maxGasCostRawAmountDecimals,
  } = params;
  const targetServerId = chainServerId || TEMPO_CHAIN_SERVER_ID;
  const dict = new Map<string, TokenItem>();

  tokenList.forEach((token) => {
    const tokenId = (token.id || '').toLowerCase();
    if (!tokenId) return;
    if ((token.chain || '').toLowerCase() !== targetServerId.toLowerCase())
      return;
    if (!TEMPO_FEE_TOKEN_WHITELIST_MAP.has(tokenId)) return;
    dict.set(tokenId, mapTokenToTempoFeeTokenOption(token, targetServerId));
  });

  TEMPO_FEE_TOKEN_WHITELIST.forEach((white) => {
    const key = white.tokenId.toLowerCase();
    if (dict.has(key)) return;
    dict.set(
      key,
      createTempoTokenItem({
        tokenId: white.tokenId,
        symbol: white.symbol,
        decimals: TEMPO_FEE_TOKEN_DECIMALS,
        rawAmountHex: '0x0',
        usdValue: 0,
        chainServerId: targetServerId,
      })
    );
  });
  return markTempoFeeTokenOptionsByGas([...dict.values()], {
    maxGasCostRawAmountIn18,
    maxGasCostRawAmount,
    maxGasCostRawAmountDecimals,
  });
};

export const listTempoFeeTokenOptions = async (params: {
  wallet: WalletControllerType;
  userAddress?: string | null;
  chainServerId?: string | null;
  maxGasCostRawAmountIn18?: string | number | BigNumber;
  maxGasCostRawAmount?: string | number | BigNumber;
  maxGasCostRawAmountDecimals?: number;
  currentFeeTokenInfo?: TempoFeeTokenInfo | null;
}) => {
  const {
    wallet,
    userAddress,
    chainServerId,
    maxGasCostRawAmountIn18,
    maxGasCostRawAmount,
    maxGasCostRawAmountDecimals,
    currentFeeTokenInfo,
  } = params;
  const targetServerId = chainServerId || TEMPO_CHAIN_SERVER_ID;
  if (!userAddress) return [] as TokenItem[];

  const [defaultFeeToken, list] = await Promise.all([
    currentFeeTokenInfo
      ? Promise.resolve(currentFeeTokenInfo)
      : getTempoFeeTokenInfo({
          wallet,
          userAddress,
          chainServerId: targetServerId,
        }),
    wallet.openapi
      .listToken(userAddress, targetServerId, true)
      .catch(() => [] as TokenItem[]),
  ]);

  const dict = new Map<string, TokenItem>();
  list.forEach((token) => {
    if (!token?.id) return;
    const key = token.id.toLowerCase();
    if (!TEMPO_FEE_TOKEN_WHITELIST_MAP.has(key)) return;
    const whitelistMeta = TEMPO_FEE_TOKEN_WHITELIST_MAP.get(key);
    const option = mapTokenToTempoFeeTokenOption(token, targetServerId);
    dict.set(key, {
      ...option,
      symbol: whitelistMeta?.symbol || option.symbol || '',
      display_symbol: whitelistMeta?.symbol || option.display_symbol || '',
      optimized_symbol: whitelistMeta?.symbol || option.optimized_symbol || '',
      name: whitelistMeta?.symbol || option.name || '',
    });
  });

  for (const white of TEMPO_FEE_TOKEN_WHITELIST) {
    const key = white.tokenId.toLowerCase();
    if (dict.has(key)) continue;

    let token: TokenItem | null = null;
    try {
      token = await wallet.openapi.getToken(
        userAddress,
        targetServerId,
        white.tokenId
      );
    } catch {
      token = null;
    }

    if (token?.id) {
      const option = mapTokenToTempoFeeTokenOption(token, targetServerId);
      dict.set(key, {
        ...option,
        id: white.tokenId,
        symbol: white.symbol,
        display_symbol: white.symbol,
        optimized_symbol: white.symbol,
        name: white.symbol,
      });
      continue;
    }

    const isDefault = key === defaultFeeToken.tokenId.toLowerCase();
    const fallback = createTempoTokenItem({
      tokenId: white.tokenId,
      symbol: white.symbol,
      decimals: isDefault ? defaultFeeToken.decimals : TEMPO_FEE_TOKEN_DECIMALS,
      logoUrl: isDefault ? defaultFeeToken.logoUrl : '',
      rawAmountHex: isDefault ? defaultFeeToken.rawBalanceHex || '0x0' : '0x0',
      usdValue: 0,
      chainServerId: targetServerId,
    });
    dict.set(key, fallback);
  }

  return markTempoFeeTokenOptionsByGas([...dict.values()], {
    maxGasCostRawAmountIn18,
    maxGasCostRawAmount,
    maxGasCostRawAmountDecimals,
  });
};

export const resolveTempoPreferredFeeTokenId = (params: {
  chainServerId?: string | null;
  txFeeToken?: string | null;
  currentFeeTokenId?: string | null;
}) => {
  const { chainServerId, txFeeToken, currentFeeTokenId } = params;
  if (!isTempoChain(chainServerId)) {
    return txFeeToken || currentFeeTokenId || '';
  }

  if (txFeeToken && txFeeToken.trim()) {
    return txFeeToken;
  }

  if (currentFeeTokenId && currentFeeTokenId.trim()) {
    return currentFeeTokenId;
  }

  return TEMPO_PATH_USD_TOKEN;
};

export const findTempoFeeTokenOption = (
  options: TempoFeeTokenOption[],
  tokenId?: string | null
) => {
  if (!tokenId) return undefined;

  return options.find((item) => isSameTokenId(item.id, tokenId));
};

const findEnabledTempoFeeTokenOption = (
  options: TempoFeeTokenOption[],
  tokenId?: string | null
) => {
  if (!tokenId) return undefined;

  return options.find(
    (item) =>
      isSameTokenId(item.id, tokenId) && !item.isDisabledByTempoGasBalance
  );
};

export const loadTempoFeeTokenOptionsState = async (params: {
  wallet: WalletControllerType;
  userAddress?: string | null;
  chainServerId?: string | null;
  tokenList?: TokenItem[];
  txFeeToken?: string | null;
  currentFeeTokenId?: string | null;
  maxGasCostRawAmountIn18?: string | number | BigNumber;
  maxGasCostRawAmount?: string | number | BigNumber;
  maxGasCostRawAmountDecimals?: number;
}) => {
  const {
    wallet,
    userAddress,
    chainServerId,
    tokenList = [],
    txFeeToken,
    currentFeeTokenId,
    maxGasCostRawAmountIn18,
    maxGasCostRawAmount,
    maxGasCostRawAmountDecimals,
  } = params;
  const targetServerId = chainServerId || TEMPO_CHAIN_SERVER_ID;
  const cachedOptions = listTempoFeeTokenOptionsFromCache({
    tokenList,
    chainServerId: targetServerId,
    maxGasCostRawAmountIn18,
    maxGasCostRawAmount,
    maxGasCostRawAmountDecimals,
  });

  const fetchedCurrentFeeTokenInfo =
    currentFeeTokenId || !userAddress
      ? null
      : await getTempoFeeTokenInfo({
          wallet,
          userAddress,
          chainServerId: targetServerId,
        });
  const resolvedCurrentFeeTokenId =
    currentFeeTokenId || fetchedCurrentFeeTokenInfo?.tokenId || '';
  const preferredTokenId = resolveTempoPreferredFeeTokenId({
    chainServerId: targetServerId,
    txFeeToken,
    currentFeeTokenId: resolvedCurrentFeeTokenId,
  });
  const options: TempoFeeTokenOption[] = userAddress
    ? await listTempoFeeTokenOptions({
        wallet,
        userAddress,
        chainServerId: targetServerId,
        maxGasCostRawAmountIn18,
        maxGasCostRawAmount,
        maxGasCostRawAmountDecimals,
        currentFeeTokenInfo: fetchedCurrentFeeTokenInfo,
      })
    : [];
  const selectedOption =
    findEnabledTempoFeeTokenOption(options, preferredTokenId) ||
    findEnabledTempoFeeTokenOption(cachedOptions, preferredTokenId) ||
    options.find((item) => !item.isDisabledByTempoGasBalance) ||
    cachedOptions.find((item) => !item.isDisabledByTempoGasBalance);

  return {
    cachedOptions,
    options,
    currentFeeTokenId: resolvedCurrentFeeTokenId,
    preferredTokenId,
    selectedOption,
  };
};
