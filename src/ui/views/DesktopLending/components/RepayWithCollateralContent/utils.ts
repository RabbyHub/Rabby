import { valueToBigNumber } from '@aave/math-utils';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import { BigNumber as EthersBigNumber, PopulatedTransaction } from 'ethers';

import { MarketDataType } from '../../config/market';
import { getAssetGroup } from '../../config/swap';
import { SwappableToken, SwapType } from '../../types/swap';
import { SupportedChainId } from '../../utils/native';

export const DEFAULT_REPAY_WITH_COLLATERAL_SLIPPAGE = 100; // 1%

const REPAY_WITH_COLLATERAL_SUPPORTED_CHAINS = [
  SupportedChainId.ARBITRUM_ONE,
  SupportedChainId.AVALANCHE,
  SupportedChainId.BNB,
  SupportedChainId.GNOSIS_CHAIN,
  SupportedChainId.MAINNET,
  SupportedChainId.POLYGON,
  SupportedChainId.SEPOLIA,
];

export const isSupportRepayWithCollateral = (
  chainId: number,
  market?: MarketDataType
) => {
  const marketEnabledFeatures =
    market?.enabledFeatures?.collateralRepay &&
    market.addresses.REPAY_WITH_COLLATERAL_ADAPTER;

  return (
    REPAY_WITH_COLLATERAL_SUPPORTED_CHAINS.includes(
      chainId as SupportedChainId
    ) && !!marketEnabledFeatures
  );
};

export const maxInputAmountWithSlippage = (
  amount: string,
  slippageBps: number
) => {
  const amountBn = new BigNumber(amount || 0);
  if (amountBn.lte(0)) {
    return '0';
  }

  return amountBn
    .multipliedBy(new BigNumber(1).plus(new BigNumber(slippageBps).div(10000)))
    .integerValue(BigNumber.ROUND_CEIL)
    .toFixed(0);
};

export const formatTx = (
  tx: PopulatedTransaction,
  fromAddress: string,
  chainId: number
) => {
  if (!tx.data) {
    return null;
  }

  const formattedTx = {
    from: tx.from || fromAddress,
    to: tx.to,
    data: tx.data,
    value:
      tx.value && EthersBigNumber.isBigNumber(tx.value)
        ? tx.value.toHexString()
        : tx.value ?? '0x0',
    chainId,
  };

  if (tx.nonce !== undefined) {
    (formattedTx as Tx).nonce = tx.nonce.toString();
  }

  return formattedTx as Tx;
};

export const getParaswapSlippage = (
  inputSymbol: string,
  outputSymbol: string,
  swapType: SwapType
) => {
  const inputGroup = getAssetGroup(inputSymbol);
  const outputGroup = getAssetGroup(outputSymbol);
  const baseSlippage = inputGroup === outputGroup ? 10 : 20;

  if (swapType === SwapType.RepayWithCollateral) {
    return baseSlippage * 5;
  }

  return baseSlippage;
};

const valueLostPercentage = (destValueInUsd: number, srcValueInUsd: number) => {
  if (destValueInUsd === 0) {
    return 1;
  }
  if (srcValueInUsd === 0) {
    return 0;
  }

  const receivingPercentage = destValueInUsd / srcValueInUsd;
  return receivingPercentage ? 1 - receivingPercentage : 0;
};

const shouldShowWarning = (lostValue: number, srcValueInUsd: number) => {
  if (srcValueInUsd > 500000) {
    return lostValue > 0.03;
  }
  if (srcValueInUsd > 100000) {
    return lostValue > 0.04;
  }
  if (srcValueInUsd > 10000) {
    return lostValue > 0.05;
  }
  if (srcValueInUsd > 1000) {
    return lostValue > 0.07;
  }

  return lostValue > 0.05;
};

const shouldRequireConfirmation = (lostValue: number) => {
  return lostValue > 0.2;
};

export const getPriceImpactData = ({
  fromToken,
  toToken,
  fromAmount,
  toAmount,
}: {
  fromToken?: SwappableToken;
  toToken?: SwappableToken;
  fromAmount: string;
  toAmount: string;
}) => {
  if (!fromToken || !toToken || !Number(fromAmount) || !Number(toAmount)) {
    return {
      showWarning: false,
      showConfirmation: false,
      lostValue: 0,
      diff: 0,
    };
  }

  const pay = new BigNumber(fromAmount || 0).times(fromToken.usdPrice || 0);
  const receive = new BigNumber(toAmount || 0).times(toToken.usdPrice || 0);
  const lostValue = valueLostPercentage(pay.toNumber(), receive.toNumber());

  return {
    showWarning: shouldShowWarning(lostValue, receive.toNumber()),
    showConfirmation: shouldRequireConfirmation(lostValue),
    lostValue,
    diff: lostValue.toFixed(2),
  };
};

export const getToAmountAfterSlippage = ({
  inputAmount,
  slippage,
}: {
  inputAmount: string;
  slippage: number;
}) => {
  return valueToBigNumber(inputAmount)
    .multipliedBy(1 + Number(slippage) / 10000)
    .toFixed();
};

const SIGNATURE_AMOUNT_MARGIN = 0.1;

export const calculateSignedAmount = (amount: string, margin?: number) => {
  const amountBn = valueToBigNumber(amount);
  const marginBn = valueToBigNumber(margin ?? SIGNATURE_AMOUNT_MARGIN);

  return amountBn.plus(amountBn.multipliedBy(marginBn)).toFixed(0);
};
