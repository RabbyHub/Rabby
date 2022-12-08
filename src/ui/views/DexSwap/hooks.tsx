import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import { isSameAddress, useWallet } from '@/ui/utils';
import { validateToken, ValidateTokenParam } from '@/ui/utils/token';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { GasLevel, Tx } from '@debank/rabby-api/dist/types';
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

const ETH_USDT_CONTRACT = '0xdac17f958d2ee523a2206206994597c13d831ec7';

export const useVerifyToken = <T extends ValidateTokenParam>(
  payToken?: T,
  receiveToken?: T,
  chain?: CHAINS_ENUM,
  isWrapToken?: boolean
) => {
  const data = useAsync(async () => {
    if (payToken && receiveToken && chain) {
      if (
        isWrapToken ||
        isSameAddress(payToken!.id, CHAINS[chain].nativeTokenAddress)
      ) {
        return [true, true, true];
      }
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
  spender?: string,
  payTokenId?: string
) => {
  const data = useMemo(() => {
    if (
      dexId === DEX_ENUM.WRAPTOKEN ||
      (payTokenId &&
        isSameAddress(payTokenId, CHAINS[chain].nativeTokenAddress))
    ) {
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
    data?.spender,
    payToken?.id
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
    chain,
    dexId === DEX_ENUM.WRAPTOKEN
  );

  const wallet = useWallet();

  const { value: tokenApprovalResult = [true, false] } = useAsync(async () => {
    if (!payToken || !dexId || !payAmount) return [true, false];
    if (payToken?.id === CHAINS[chain].nativeTokenAddress) {
      return [true, false];
    }
    const allowance = await wallet.getERC20Allowance(
      CHAINS[chain].serverId,
      payToken!.id,
      DEX_SPENDER_WHITELIST[dexId][chain]
    );

    const tokenApproved = new BigNumber(allowance).gte(
      new BigNumber(payAmount).times(10 ** payToken.decimals)
    );

    if (
      chain === CHAINS_ENUM.ETH &&
      isSameAddress(payToken.id, ETH_USDT_CONTRACT) &&
      Number(allowance) !== 0 &&
      !tokenApproved
    ) {
      return [tokenApproved, true];
    }
    return [tokenApproved, false];
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

    tokenApproved: tokenApprovalResult[0],
    shouldTwoStepApprove: tokenApprovalResult[1],
  };
};

interface UseGasAmountParams<T extends ValidateTokenParam> {
  chain?: CHAINS_ENUM;
  data?: QuoteResult;
  payToken?: T;
  receiveToken?: T;
  dexId?: DEX_ENUM | null;
  gasMarket?: GasLevel[];
  gasLevel: GasLevel;
  tokenApproved: boolean;
  shouldTwoStepApprove: boolean;
  userAddress: string;
  refreshId: number;
  payAmount: string;
}

export const useGasAmount = <T extends ValidateTokenParam>(
  p: UseGasAmountParams<T>
) => {
  const wallet = useWallet();
  const {
    payAmount,
    chain,
    data,
    payToken,
    dexId,
    gasMarket,
    gasLevel,
    tokenApproved,
    shouldTwoStepApprove,
    userAddress,
    refreshId,
  } = p;
  const {
    value: totalGasUsed,
    loading: totalGasUsedLoading,
  } = useAsync(async () => {
    if (chain && payAmount && data && payToken && dexId && gasMarket) {
      const nonce = await wallet.getRecommendNonce({
        from: data.tx.from,
        chainId: CHAINS[chain].id,
      });

      let gasPrice = gasLevel.price;
      if (gasLevel.level !== 'custom') {
        const selectGas = (gasMarket || []).find(
          (e) => e.level === gasLevel.level
        );
        gasPrice = selectGas?.price || 0;
      }

      let gasUsed = 0;

      let nextNonce = nonce;

      const pendingTx: Tx[] = [];

      const approveToken = async (amount: string) => {
        const tokenApproveParams = await wallet.generateApproveTokenTx({
          from: userAddress,
          to: payToken!.id,
          chainId: CHAINS[chain].id,
          spender: DEX_SPENDER_WHITELIST[dexId][chain],
          amount: amount,
        });
        const tokenApproveTx = {
          ...tokenApproveParams,
          nonce: nextNonce,
          value: '0x',
          gasPrice: `0x${new BigNumber(gasPrice).toString(16)}`,
          gas: '0x0',
        };
        const tokenApprovePreExecTx = await wallet.openapi.preExecTx({
          tx: tokenApproveTx,
          origin: INTERNAL_REQUEST_ORIGIN,
          address: userAddress,
          updateNonce: true,
          pending_tx_list: pendingTx,
        });

        gasUsed += tokenApprovePreExecTx.gas.gas_used;
        pendingTx.push({
          ...tokenApproveTx,
          gas: `0x${new BigNumber(tokenApprovePreExecTx.gas.gas_used)
            .times(4)
            .toString(16)}`,
        });
        nextNonce = `0x${new BigNumber(nextNonce).plus(1).toString(16)}`;
      };

      if (shouldTwoStepApprove) {
        await approveToken('0');
      }

      if (!tokenApproved) {
        await approveToken(
          new BigNumber(payAmount).times(10 ** payToken.decimals).toFixed(0, 1)
        );
      }

      const swapPreExecTx = await wallet.openapi.preExecTx({
        tx: {
          ...data.tx,
          nonce: nextNonce,
          chainId: CHAINS[chain].id,
          value: `0x${new BigNumber(data.tx.value).toString(16)}`,
          gasPrice: `0x${new BigNumber(gasPrice).toString(16)}`,
          gas: '0x0',
        } as Tx,
        origin: INTERNAL_REQUEST_ORIGIN,
        address: userAddress,
        updateNonce: true,
        pending_tx_list: pendingTx,
      });

      return gasUsed + swapPreExecTx.gas.gas_used;
    }
    return;
  }, [
    chain,
    data,
    refreshId,
    tokenApproved,
    dexId,
    gasLevel,
    gasMarket,
    shouldTwoStepApprove,
    payAmount,
  ]);

  return {
    totalGasUsed,
    totalGasUsedLoading,
  };
};
