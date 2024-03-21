import { isSameAddress } from '@/background/utils';
import { CHAINS_ENUM, CHAINS } from '@debank/common';
import { DEX_ENUM } from '@rabby-wallet/rabby-swap';
import {
  decodeCalldata,
  QuoteResult,
  DecodeCalldataResult,
} from '@rabby-wallet/rabby-swap/dist/quote';
import { useMemo } from 'react';
import { getRouter, getSpender, isSwapWrapToken } from './quote';
import BigNumber from 'bignumber.js';
import { findChain } from '@/utils/chain';

type ValidateTokenParam = {
  id: string;
  symbol: string;
  decimals: number;
};

export const useVerifyRouterAndSpender = (
  chain: CHAINS_ENUM,
  dexId: DEX_ENUM,
  router?: string,
  spender?: string,
  payTokenId?: string,
  receiveTokenId?: string
) => {
  const data = useMemo(() => {
    if (dexId === DEX_ENUM.WRAPTOKEN) {
      return [true, true];
    }
    if (!dexId || !router || !spender || !payTokenId || !receiveTokenId) {
      return [true, true];
    }
    const routerWhitelist = getRouter(dexId, chain);
    const spenderWhitelist = getSpender(dexId, chain);
    const isNativeToken = isSameAddress(
      payTokenId,
      CHAINS[chain].nativeTokenAddress
    );
    const isWrapTokens = isSwapWrapToken(payTokenId, receiveTokenId, chain);

    return [
      isSameAddress(routerWhitelist, router),
      isNativeToken || isWrapTokens
        ? true
        : isSameAddress(spenderWhitelist, spender),
    ];
  }, [chain, dexId, payTokenId, receiveTokenId, router, spender]);
  return data;
};

const isNativeToken = (chain: CHAINS_ENUM, tokenId: string) =>
  isSameAddress(tokenId, CHAINS[chain].nativeTokenAddress);

export const useVerifyCalldata = <
  T extends Parameters<typeof decodeCalldata>[1]
>(
  data: QuoteResult | null,
  dexId: DEX_ENUM | null,
  slippage: string | number,
  tx?: T
) => {
  const callDataResult = useMemo(() => {
    if (dexId && dexId !== DEX_ENUM.WRAPTOKEN && tx) {
      try {
        return decodeCalldata(dexId, tx) as DecodeCalldataResult;
      } catch (error) {
        return null;
      }
    }
    return null;
  }, [dexId, tx]);

  const result = useMemo(() => {
    if (slippage && callDataResult && data && tx) {
      const estimateMinReceive = new BigNumber(data.toTokenAmount).times(
        new BigNumber(1).minus(slippage)
      );
      const chain = findChain({
        id: tx.chainId,
      });

      if (!chain) return true;

      return (
        ((dexId === DEX_ENUM['UNISWAP'] &&
          isNativeToken(chain.enum, data.fromToken)) ||
          isSameAddress(callDataResult.fromToken, data.fromToken)) &&
        callDataResult.fromTokenAmount === data.fromTokenAmount &&
        isSameAddress(callDataResult.toToken, data.toToken) &&
        new BigNumber(callDataResult.minReceiveToTokenAmount)
          .minus(estimateMinReceive)
          .div(estimateMinReceive)
          .abs()
          .lte(0.05)
      );
    }
    return true;
  }, [callDataResult, data, slippage]);

  return result;
};

type VerifySdkParams<T extends ValidateTokenParam> = {
  chain: CHAINS_ENUM;
  dexId: DEX_ENUM;
  slippage: string | number;
  data: QuoteResult | null;
  payToken: T;
  receiveToken: T;
};

export const useVerifySdk = <T extends ValidateTokenParam>(
  p: VerifySdkParams<T>
) => {
  const { chain, dexId, slippage, data, payToken, receiveToken } = p;

  const isWrapTokens = isSwapWrapToken(payToken.id, receiveToken.id, chain);
  const actualDexId = isWrapTokens ? DEX_ENUM.WRAPTOKEN : dexId;

  const [routerPass, spenderPass] = useVerifyRouterAndSpender(
    chain,
    actualDexId,
    data?.tx?.to,
    data?.spender,
    payToken?.id,
    receiveToken?.id
  );

  const callDataPass = useVerifyCalldata(
    data,
    actualDexId,
    new BigNumber(slippage).div(100).toFixed(),
    data?.tx ? { ...data?.tx, chainId: CHAINS[chain].id } : undefined
  );

  return {
    isSdkDataPass: routerPass && spenderPass && callDataPass,
  };
};
