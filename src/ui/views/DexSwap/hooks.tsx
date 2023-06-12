import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import { isSameAddress, useWallet } from '@/ui/utils';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { GasLevel, Tx } from '@debank/rabby-api/dist/types';
import {
  DEX_ROUTER_WHITELIST,
  DEX_SPENDER_WHITELIST,
} from '@/constant/dex-swap';
import { DEX_ENUM, WrapTokenAddressMap } from '@rabby-wallet/rabby-swap';
import {
  decodeCalldata,
  DecodeCalldataResult,
  QuoteResult,
} from '@rabby-wallet/rabby-swap/dist/quote';
import BigNumber from 'bignumber.js';
import { useMemo, useState } from 'react';
import { useAsync } from 'react-use';
import { findChainByEnum } from '@/utils/chain';

export type ValidateTokenParam = {
  id: string;
  symbol: string;
  decimals: number;
};

const ETH_USDT_CONTRACT = '0xdac17f958d2ee523a2206206994597c13d831ec7';

export const useVerifyRouterAndSpender = (
  chain: CHAINS_ENUM,
  dexId?: DEX_ENUM | null,
  router?: string,
  spender?: string,
  payTokenId?: string
) => {
  const data = useMemo(() => {
    if (dexId === DEX_ENUM.WRAPTOKEN) {
      return [true, true] as const;
    }
    if (!dexId || !router || !spender) {
      return [true, true] as const;
    }
    const routerWhitelist = DEX_ROUTER_WHITELIST[dexId][chain];
    const spenderWhitelist = DEX_SPENDER_WHITELIST[dexId][chain];
    return [
      !!routerWhitelist && isSameAddress(routerWhitelist, router),
      payTokenId &&
      CHAINS[chain] &&
      isSameAddress(payTokenId, CHAINS[chain].nativeTokenAddress) // When payToken is native token, no need to approve so no need to verify spender
        ? true
        : isSameAddress(spenderWhitelist, spender),
    ] as const;
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
      try {
        return decodeCalldata(dexId, tx) as DecodeCalldataResult;
      } catch (error) {
        return null;
      }
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
};
export const useVerifySdk = <T extends ValidateTokenParam>(
  p: VerifySdkParams<T>
) => {
  const { chain, dexId, slippage, data, payToken } = p;
  const chainItem = useMemo(() => findChainByEnum(chain), [chain]);

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
    data?.tx && chainItem ? { ...data?.tx, chainId: chainItem.id } : undefined,
    data
  );

  return {
    routerPass,
    spenderPass,
    callDataPass,
    isSdkDataPass: routerPass && spenderPass && callDataPass,
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
    userAddress,
    refreshId,
    receiveToken,
  } = p;

  const [approveStatus, setApproveStatus] = useState([true, false]);

  const {
    value: totalGasUsed,
    loading: totalGasUsedLoading,
    error,
  } = useAsync(async () => {
    const chainItem = chain ? findChainByEnum(chain) : null;
    if (
      chain &&
      chainItem &&
      payAmount &&
      data &&
      payToken &&
      dexId &&
      gasMarket
    ) {
      const nonce = await wallet.getRecommendNonce({
        from: data.tx.from,
        chainId: chainItem.id,
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
          chainId: chainItem.id,
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

        if (!tokenApprovePreExecTx?.pre_exec?.success) {
          throw new Error('pre exec error');
        }

        gasUsed += tokenApprovePreExecTx.gas.gas_used;
        pendingTx.push({
          ...tokenApproveTx,
          gas: `0x${new BigNumber(tokenApprovePreExecTx.gas.gas_used)
            .times(4)
            .toString(16)}`,
        });
        nextNonce = `0x${new BigNumber(nextNonce).plus(1).toString(16)}`;
      };

      const getTokenApproveStatus = async () => {
        if (!payToken || !receiveToken || !dexId || !payAmount)
          return [true, false];

        if (
          payToken?.id === chainItem.nativeTokenAddress ||
          isSwapWrapToken(payToken.id, receiveToken.id, chain)
        ) {
          return [true, false];
        }
        const allowance = await wallet.getERC20Allowance(
          chainItem.serverId,
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
      };

      const [
        tokenApproved,
        shouldTwoStepApprove,
      ] = await getTokenApproveStatus();

      setApproveStatus([tokenApproved, shouldTwoStepApprove]);

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
          chainId: chainItem.id,
          value: `0x${new BigNumber(data.tx.value).toString(16)}`,
          gasPrice: `0x${new BigNumber(gasPrice).toString(16)}`,
          gas: '0x0',
        } as Tx,
        origin: INTERNAL_REQUEST_ORIGIN,
        address: userAddress,
        updateNonce: true,
        pending_tx_list: pendingTx,
      });

      if (!swapPreExecTx?.pre_exec?.success) {
        throw new Error('pre exec error');
      }

      return gasUsed + swapPreExecTx.gas.gas_used;
    }
    return;
  }, [chain, data, refreshId, dexId, gasLevel, gasMarket, payAmount]);

  return {
    tokenApproved: approveStatus[0],
    shouldTwoStepApprove: approveStatus[1],
    totalGasUsed,
    totalGasUsedLoading,
    preExecTxError: error,
  };
};

function isSwapWrapToken(
  payTokenId: string,
  receiveId: string,
  chain: CHAINS_ENUM
) {
  const wrapTokens = [
    WrapTokenAddressMap[chain],
    findChainByEnum(chain)?.nativeTokenAddress,
  ] as const;
  return (
    !!wrapTokens.find((token) => isSameAddress(payTokenId, token)) &&
    !!wrapTokens.find((token) => isSameAddress(receiveId, token))
  );
}
