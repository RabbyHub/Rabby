import { BigNumber } from 'bignumber.js';
import { GasLevel, TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Contract, providers } from 'ethers';
import { hexToString } from 'web3-utils';
import { AbstractPortfolioToken } from './portfolio/types';
import { CustomTestnetToken } from '@/background/service/customTestnet';
import { findChain, findChainByEnum } from '@/utils/chain';
import { CHAINS_ENUM, MINIMUM_GAS_LIMIT } from '@/constant';

export const geTokenDecimals = async (
  id: string,
  provider: providers.JsonRpcProvider
) => {
  try {
    const contract = new Contract(
      id,
      [
        {
          constant: true,
          inputs: [],
          name: 'decimals',
          outputs: [
            {
              name: '',
              type: 'uint8',
            },
          ],
          payable: false,
          stateMutability: 'view',
          type: 'function',
        },
      ],
      provider
    );
    const decimals = await contract.decimals();
    return decimals;
  } catch (e) {
    const contract = new Contract(
      id,
      [
        {
          constant: true,
          inputs: [],
          name: 'DECIMALS',
          outputs: [
            {
              name: '',
              type: 'uint8',
            },
          ],
          payable: false,
          stateMutability: 'view',
          type: 'function',
        },
      ],
      provider
    );
    return contract.DECIMALS();
  }
};

export const getTokenName = async (
  id: string,
  provider: providers.JsonRpcProvider
) => {
  try {
    const contract = new Contract(
      id,
      [
        {
          constant: true,
          inputs: [],
          name: 'name',
          outputs: [
            {
              name: '',
              type: 'string',
            },
          ],
          payable: false,
          stateMutability: 'view',
          type: 'function',
        },
      ],
      provider
    );
    const name = await contract.name();
    return name;
  } catch (e) {
    try {
      const contract = new Contract(
        id,
        [
          {
            constant: true,
            inputs: [],
            name: 'name',
            outputs: [
              {
                name: '',
                type: 'bytes32',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
        ],
        provider
      );
      const name = await contract.name();
      return hexToString(name);
    } catch (e) {
      const contract = new Contract(
        id,
        [
          {
            constant: true,
            inputs: [],
            name: 'NAME',
            outputs: [
              {
                name: '',
                type: 'string',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
        ],
        provider
      );
      return contract.NAME();
    }
  }
};

export const getTokenSymbol = (
  token?: Partial<
    Pick<TokenItem, 'display_symbol' | 'symbol' | 'optimized_symbol'>
  >
) => {
  if (!token) return '';

  return token.display_symbol || token.symbol || token.optimized_symbol || '';
};

export const ellipsisTokenSymbol = (text: string, length = 6) => {
  if (text?.length <= length) return text;

  const regexp = new RegExp(`^(.{${length}})(.*)$`);
  return text?.replace(regexp, '$1...');
};

export const abstractTokenToTokenItem = (
  token: AbstractPortfolioToken
): TokenItem => {
  return {
    id: token._tokenId,
    chain: token.chain,
    amount: token.amount,
    raw_amount: token.raw_amount,
    decimals: token.decimals,
    display_symbol: token.display_symbol,
    is_core: token.is_core,
    is_verified: token.is_verified,
    is_wallet: token.is_wallet,
    is_scam: token.is_scam,
    is_suspicious: token.is_suspicious,
    logo_url: token.logo_url,
    name: token.name,
    optimized_symbol: token.optimized_symbol,
    price: token.price,
    symbol: token.symbol,
    time_at: token.time_at,
    price_24h_change: token.price_24h_change,
    low_credit_score: token?.low_credit_score,
  };
};

export const customTestnetTokenToTokenItem = (
  token: CustomTestnetToken
): TokenItem => {
  const chain = findChain({
    id: token.chainId,
  });
  return {
    id: token.id,
    chain: chain?.serverId || '',
    amount: token.amount,
    raw_amount: token.rawAmount,
    raw_amount_hex_str: `0x${new BigNumber(token.rawAmount || 0).toString(16)}`,
    decimals: token.decimals,
    display_symbol: token.symbol,
    is_core: false,
    is_verified: false,
    is_wallet: false,
    is_scam: false,
    is_suspicious: false,
    logo_url: '',
    name: token.symbol,
    optimized_symbol: token.symbol,
    price: 0,
    symbol: token.symbol,
    time_at: 0,
    price_24h_change: 0,
  };
};

export const isTestnetTokenItem = (token: TokenItem) => {
  return findChain({
    serverId: token.chain,
  })?.isTestnet;
};

function checkGasIsEnough({
  token_balance_hex,
  price,
  gasLimit,
}: {
  token_balance_hex: TokenItem['raw_amount_hex_str'];
  price: number;
  gasLimit: number;
}) {
  return new BigNumber(token_balance_hex || 0, 16).gte(
    new BigNumber(gasLimit).times(price)
  );
}
export function checkIfTokenBalanceEnough(
  token: TokenItem,
  options?: {
    gasList?: GasLevel[];
    gasLimit?: number;
  }
) {
  const { gasLimit = MINIMUM_GAS_LIMIT, gasList = [] } = options || {};
  const normalLevel = gasList?.find((e) => e.level === 'normal');
  const slowLevel = gasList?.find((e) => e.level === 'slow');
  const customLevel = gasList?.find((e) => e.level === 'custom');

  const isNormalEnough = checkGasIsEnough({
    token_balance_hex: token?.raw_amount_hex_str,
    price: normalLevel?.price || 0,
    gasLimit,
  });
  const isSlowEnough = checkGasIsEnough({
    token_balance_hex: token?.raw_amount_hex_str,
    price: slowLevel?.price || 0,
    gasLimit,
  });

  return {
    normalLevel,
    isNormalEnough,
    isSlowEnough,
    slowLevel,
    customLevel,
  };
}

export function tokenAmountBn(token: TokenItem) {
  return new BigNumber(token?.raw_amount_hex_str || 0, 16).div(
    10 ** (token?.decimals || 1)
  );
}

export function getChainDefaultToken(chain: CHAINS_ENUM) {
  const chainInfo = findChainByEnum(chain)!;
  return {
    id: chainInfo.nativeTokenAddress,
    decimals: chainInfo.nativeTokenDecimals,
    logo_url: chainInfo.nativeTokenLogo,
    symbol: chainInfo.nativeTokenSymbol,
    display_symbol: chainInfo.nativeTokenSymbol,
    optimized_symbol: chainInfo.nativeTokenSymbol,
    is_core: true,
    is_verified: true,
    is_wallet: true,
    amount: 0,
    price: 0,
    name: chainInfo.nativeTokenSymbol,
    chain: chainInfo.serverId,
    time_at: 0,
  } as TokenItem;
}
