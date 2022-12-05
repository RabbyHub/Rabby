import { isSameAddress, useWallet } from '@/ui/utils';
import { validateToken, ValidateTokenParam } from '@/ui/utils/token';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import {
  DEX_ENUM,
  DEX_ROUTER_WHITELIST,
  DEX_SPENDER_WHITELIST,
} from '@rabby-wallet/rabby-swap';
import {
  decodeCalldata,
  DecodeCalldataResult,
  QuoteResult,
} from '@rabby-wallet/rabby-swap/dist/quote';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useAsync } from 'react-use';

export const useVerifyToken = <T extends ValidateTokenParam>(
  payToken?: T,
  receiveToken?: T,
  chain?: CHAINS_ENUM
) => {
  const data = useAsync(async () => {
    if (payToken && receiveToken) {
      const [
        fromTokenValidationStatus,
        toTokenValidationStatus,
      ] = await Promise.all([
        validateToken(payToken, chain),
        validateToken(receiveToken, chain),
      ]);

      return [
        fromTokenValidationStatus && toTokenValidationStatus,
        fromTokenValidationStatus,
        toTokenValidationStatus,
      ];
    }
    return [true, true, true];
  }, [payToken, receiveToken, chain]);
  return data;
};

export const useVerifyRouterAndSpender = (
  chain: CHAINS_ENUM,
  dexId?: DEX_ENUM | null,
  router?: string,
  spender?: string
) => {
  const data = useMemo(() => {
    if (dexId === DEX_ENUM.WRAPTOKEN) {
      return [true, true];
    }
    if (!dexId || !router || !spender) {
      return [true, true];
    }
    const routerWhitelist = DEX_ROUTER_WHITELIST[dexId][chain];
    const spenderWhitelist = DEX_SPENDER_WHITELIST[dexId][chain];
    return [
      isSameAddress(routerWhitelist, router),
      isSameAddress(spenderWhitelist, spender),
    ];
  }, [dexId, router, spender]);
  return data;
};

export const useVerifyCalldata = <
  T extends Parameters<typeof decodeCalldata>[1]
>(
  dexId?: DEX_ENUM | null,
  slippage?: string | number,
  tx?: T,
  data?: QuoteResult
) => {
  const callDataResult = useMemo(() => {
    if (dexId && dexId !== DEX_ENUM.WRAPTOKEN && tx) {
      return decodeCalldata(dexId, tx) as DecodeCalldataResult;
    }
    return null;
  }, [dexId, tx]);

  const result = useMemo(() => {
    if (slippage && callDataResult && data) {
      const estimateMinReceive = new BigNumber(data.toTokenAmount).times(
        new BigNumber(1).minus(slippage)
      );
      return (
        isSameAddress(callDataResult.fromToken, data.fromToken) &&
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
  }, [callDataResult, data]);

  return result;
};

type VerifySdkParams<T extends ValidateTokenParam> = {
  chain: CHAINS_ENUM;
  dexId?: DEX_ENUM | null;
  slippage: string | number;
  data?: QuoteResult;
  payToken?: T;
  receiveToken?: T;
  payAmount?: string;
};
export const useVerifySdk = <T extends ValidateTokenParam>(
  p: VerifySdkParams<T>
) => {
  const { chain, dexId, slippage, data, payToken, receiveToken, payAmount } = p;
  const [routerPass, spenderPass] = useVerifyRouterAndSpender(
    chain,
    dexId,
    data?.tx.to,
    data?.spender
  );

  const callDataPass = useVerifyCalldata(
    dexId,
    new BigNumber(slippage).div(100).toFixed(),
    data?.tx ? { ...data?.tx, chainId: CHAINS[chain].id } : undefined,
    data
  );

  const { value: tokenVerifyResult, loading: tokenLoading } = useVerifyToken(
    payToken,
    receiveToken,
    chain
  );

  const wallet = useWallet();

  const { value: allowance = true } = useAsync(async () => {
    if (!payToken || !dexId || !payAmount) return true;
    if (payToken?.id === CHAINS[chain].nativeTokenAddress) {
      return true;
    }
    const allowance = await wallet.getERC20Allowance(
      CHAINS[chain].serverId,
      payToken!.id,
      DEX_SPENDER_WHITELIST[dexId][chain]
    );

    return new BigNumber(allowance).gte(
      new BigNumber(payAmount).times(10 ** payToken.decimals)
    );
  }, [chain, dexId, payToken, payAmount]);

  return {
    routerPass,
    spenderPass,
    callDataPass,
    isSdkDataPass: routerPass && spenderPass && callDataPass,

    tokenLoading,
    tokenPass: !!tokenVerifyResult?.[0],
    payTokenPass: !!tokenVerifyResult?.[1],
    receiveTokenPass: !!tokenVerifyResult?.[2],

    allowance,
  };
};
