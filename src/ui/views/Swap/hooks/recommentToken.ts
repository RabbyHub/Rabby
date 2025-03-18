import {
  StableCoin,
  StablecoinMapAggregatedByChain,
} from '@/constant/dex-swap';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { isSameAddress, useWallet } from '@/ui/utils';
import { getChainDefaultToken } from '@/ui/utils/token';
import { findChain } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import { useCallback, useMemo } from 'react';
import { useAsync, useDebounce } from 'react-use';

const priority: StableCoin[] = ['usdc', 'usdt', 'dai'];

const isStableToken = (token: TokenItem, chain: CHAINS_ENUM) => {
  const map = StablecoinMapAggregatedByChain?.[chain];
  const contractAddresses = map ? Object.values(map) : undefined;
  return !!contractAddresses?.find((e) => e === token.id);
};

const findBestStableCoin = ({
  chain,
  tokenList,
}: {
  chain: CHAINS_ENUM;
  tokenList?: TokenItem[];
}): [string, string] | null => {
  const coins = StablecoinMapAggregatedByChain[chain];
  console.log('coins', coins);
  if (!coins) {
    console.log(`No stable coin config for chain: ${chain}`);
    return null;
  }

  const availableCoins = Object.entries(coins) as [StableCoin, string][];
  if (availableCoins.length === 1) {
    console.log(`Only one stable coin on ${chain}: ${availableCoins[0]}`);
    return availableCoins[0];
  }

  const balances: {
    token: StableCoin;
    balance: string;
    address: string;
  }[] = availableCoins.map(([token, address]) => ({
    token,
    balance: new BigNumber(
      tokenList?.find((e) => e.id === address)?.raw_amount_hex_str || '0'
    ).toString(10),
    address,
  }));

  const maxBalance = BigNumber.max
    .apply(
      null,
      balances.map((b) => b.balance)
    )
    .toString(10); // Math.max(...balances.map((b) => b.balance));

  const candidates = balances.filter((b) => b.balance === maxBalance);

  if (candidates.length === 1) {
    return [candidates[0].token, candidates[0].address];
  }

  for (const coin of priority) {
    const found = candidates.find((c) => c.token === coin);
    if (found) {
      return [found.token, found.address];
    }
  }

  return null;
};

export const useRecommendSwapToken = (params: {
  chain: CHAINS_ENUM;
  fromToken?: TokenItem;
  toToken?: TokenItem;
  changeFromToken: (token?: TokenItem) => void;
  changeToToken: (token?: TokenItem) => void;
}) => {
  const {
    chain: chainEnum,
    fromToken: payToken,
    toToken: receiveToken,
    changeFromToken: setPayToken,
    changeToToken: setReceiveToken,
  } = params;
  const currentAccount = useCurrentAccount();

  const chainObj = useMemo(() => findChain({ enum: chainEnum }), [chainEnum]);

  const wallet = useWallet();

  const { value: tokenList, loading } = useAsync(async () => {
    const serverId = chainObj?.serverId;
    if (!currentAccount?.address || !serverId) {
      return [];
    }

    return wallet.openapi.listToken(
      currentAccount!.address,
      findChain({ enum: chainEnum })!.serverId!
    );
  });

  const recommendToken = useCallback(
    (token: TokenItem, chain: CHAINS_ENUM, recommendType: 'from' | 'to') => {
      const isStable = isStableToken(token, chain);
      const isNativeToken = isSameAddress(
        token.id,
        chainObj?.nativeTokenAddress || ''
      );

      if (recommendType === 'from' && !isNativeToken) {
        return getChainDefaultToken(chainEnum);
      }

      if (isStable) {
        return getChainDefaultToken(chainEnum);
      }

      const contractAddress = StablecoinMapAggregatedByChain[chainEnum]
        ? Object.values(StablecoinMapAggregatedByChain[chainEnum] || {})
        : undefined;
      if (contractAddress?.length) {
        const stableCoinAddr = findBestStableCoin({
          chain: chainEnum,
          tokenList,
        });

        if (!stableCoinAddr) {
          return undefined;
        }
        const target = tokenList?.find((e) => e.id === stableCoinAddr[1]);

        return (
          target || {
            ...getChainDefaultToken(chainEnum),
            id: stableCoinAddr[1],
            logo_url: '',
            symbol: stableCoinAddr[0]?.toUpperCase(),
            optimized_symbol: stableCoinAddr[0]?.toUpperCase(),
          }
        );
      }

      return undefined;
    },
    [chainEnum, chainObj, tokenList]
  );

  useDebounce(
    () => {
      const payChain = findChain({ serverId: payToken?.chain })?.enum;
      const toChain = findChain({ serverId: receiveToken?.chain })?.enum;

      if (!payToken && receiveToken && toChain === chainEnum) {
        const currentRecommendToken = recommendToken(
          receiveToken,
          chainEnum,
          'from'
        );

        setPayToken(currentRecommendToken);

        return;
      }
      if (payToken && !receiveToken && payChain === chainEnum) {
        const currentRecommendToken = recommendToken(payToken, chainEnum, 'to');

        setReceiveToken(currentRecommendToken);
        return;
      }
    },
    100,
    [payToken, receiveToken, chainEnum, recommendToken]
  );
};
