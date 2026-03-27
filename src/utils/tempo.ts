import {
  TEMPO_CHAIN_SERVER_ID,
  TEMPO_FEE_MANAGER_ADDRESS,
  TEMPO_FEE_TOKEN_DECIMALS,
  TEMPO_PATH_USD_TOKEN,
} from '@/constant/tempo';
import type { WalletControllerType } from '@/ui/utils';
import type { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import {
  decodeFunctionResult,
  encodeFunctionData,
  isAddress,
  toHex,
} from 'viem';

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

const normalizeChainServerId = (chainServerId?: string | null) =>
  (chainServerId || '').toLowerCase();

export const isTempoChain = (chainServerId?: string | null) => {
  const normalized = normalizeChainServerId(chainServerId);
  const base = normalizeChainServerId(TEMPO_CHAIN_SERVER_ID);
  return normalized === base;
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
}) => {
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
