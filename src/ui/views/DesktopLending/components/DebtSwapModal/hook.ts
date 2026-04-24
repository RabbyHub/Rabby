import { useEffect, useMemo, useRef, useState } from 'react';
import { constants } from 'ethers';
import { OptimalRate } from '@paraswap/sdk';
import BigNumber from 'bignumber.js';
import { valueToBigNumber } from '@aave/math-utils';

import { formatTokenAmount } from '@/ui/utils/number';
import { isSameAddress } from '@/ui/utils';

import { useLendingSummary } from '../../hooks';
import { formatUsdValue } from '../../utils/format';
import { SwappableToken, SwapType } from '../../types/swap';
import { calculateHFAfterSwap } from '../../utils/hfUtils';
import {
  LIQUIDATION_DANGER_THRESHOLD,
  LIQUIDATION_SAFETY_THRESHOLD,
} from '../../utils/constant';
import { DEFAULT_DEBT_SWAP_SLIPPAGE } from './utils';
import {
  getParaswapSlippage,
  maxInputAmountWithSlippage,
} from '../../utils/swapAction';

export const useFormatValues = ({
  fromToken,
  toToken,
  fromAmount,
  toAmount,
}: {
  fromToken: SwappableToken;
  toToken?: SwappableToken;
  fromAmount: string;
  toAmount: string;
}) => {
  const fromBalanceBn = useMemo(() => new BigNumber(fromToken?.balance || 0), [
    fromToken,
  ]);

  const fromBalanceDisplay = useMemo(
    () => formatTokenAmount(fromBalanceBn.toString(10)),
    [fromBalanceBn]
  );

  const fromUsdValue = useMemo(
    () =>
      formatUsdValue(
        new BigNumber(fromAmount || 0)
          .times(fromToken?.usdPrice || 0)
          .toString(10)
      ),
    [fromAmount, fromToken?.usdPrice]
  );

  const toUsdValue = useMemo(() => {
    if (!toToken) {
      return formatUsdValue(0);
    }

    return formatUsdValue(
      new BigNumber(toAmount || 0).times(toToken?.usdPrice || 0).toString(10)
    );
  }, [toAmount, toToken]);

  return {
    fromBalanceDisplay,
    fromUsdValue,
    toUsdValue,
    fromBalanceBn,
  };
};

export const useSwapReserves = ({
  fromToken,
  toToken,
}: {
  fromToken: SwappableToken;
  toToken?: SwappableToken;
}) => {
  const {
    formattedPoolReservesAndIncentives,
    displayPoolReserves,
  } = useLendingSummary();

  const fromReserve = useMemo(
    () =>
      formattedPoolReservesAndIncentives?.find((item) =>
        isSameAddress(item.underlyingAsset, fromToken.underlyingAddress)
      ),
    [formattedPoolReservesAndIncentives, fromToken.underlyingAddress]
  );

  const toReserve = useMemo(
    () =>
      formattedPoolReservesAndIncentives?.find((item) =>
        isSameAddress(
          item.underlyingAsset,
          toToken?.underlyingAddress || constants.AddressZero
        )
      ),
    [formattedPoolReservesAndIncentives, toToken?.underlyingAddress]
  );

  const toDisplayReserve = useMemo(() => {
    if (!toToken?.underlyingAddress) {
      return undefined;
    }
    return displayPoolReserves.find((item) =>
      isSameAddress(item.underlyingAsset, toToken.underlyingAddress)
    );
  }, [displayPoolReserves, toToken?.underlyingAddress]);

  const fromDisplayReserve = useMemo(() => {
    if (!fromToken.underlyingAddress) {
      return undefined;
    }
    return displayPoolReserves.find((item) =>
      isSameAddress(item.underlyingAsset, fromToken.underlyingAddress)
    );
  }, [displayPoolReserves, fromToken.underlyingAddress]);

  const isSameToken = useMemo(() => {
    if (!toToken) {
      return false;
    }
    return isSameAddress(
      toToken.underlyingAddress,
      fromToken.underlyingAddress
    );
  }, [fromToken.underlyingAddress, toToken]);

  return {
    fromReserve,
    toReserve,
    isSameToken,
    toDisplayReserve,
    fromDisplayReserve,
  };
};

export const useDebtSwapSlippage = ({
  fromToken,
  toToken,
  setSwapRate,
}: {
  fromToken: SwappableToken;
  toToken?: SwappableToken;
  setSwapRate: React.Dispatch<
    React.SetStateAction<{
      optimalRateData?: OptimalRate;
      inputAmount?: string;
      outputAmount?: string;
      slippageBps?: number;
      maxInputAmountWithSlippage?: string;
    }>
  >;
}) => {
  const [slippage, setSlippage] = useState<string>(
    new BigNumber(DEFAULT_DEBT_SWAP_SLIPPAGE).div(100).toString(10)
  );
  const [autoSlippage, setAutoSlippage] = useState(true);
  const [isCustomSlippage, setIsCustomSlippage] = useState(false);

  const recommendedSlippageBps = useMemo(() => {
    if (!toToken) {
      return DEFAULT_DEBT_SWAP_SLIPPAGE;
    }
    return getParaswapSlippage(
      fromToken.symbol || '',
      toToken.symbol || '',
      SwapType.DebtSwap
    );
  }, [fromToken.symbol, toToken]);

  const displaySlippage = useMemo(() => {
    const value = autoSlippage
      ? recommendedSlippageBps
      : new BigNumber(slippage || 0).times(100).toNumber();

    return new BigNumber(value || DEFAULT_DEBT_SWAP_SLIPPAGE)
      .div(100)
      .toString(10);
  }, [autoSlippage, recommendedSlippageBps, slippage]);

  const selectedSlippageBps = useMemo(() => {
    if (autoSlippage) {
      return recommendedSlippageBps || DEFAULT_DEBT_SWAP_SLIPPAGE;
    }

    const bps = new BigNumber(slippage || 0)
      .times(100)
      .integerValue(BigNumber.ROUND_FLOOR)
      .toNumber();

    const clamped = Math.min(Math.max(bps, 10), 5000);
    return clamped || DEFAULT_DEBT_SWAP_SLIPPAGE;
  }, [autoSlippage, recommendedSlippageBps, slippage]);

  useEffect(() => {
    if (autoSlippage) {
      setSlippage(
        new BigNumber(recommendedSlippageBps || DEFAULT_DEBT_SWAP_SLIPPAGE)
          .div(100)
          .toString(10)
      );
      setIsCustomSlippage(false);
    }
  }, [autoSlippage, recommendedSlippageBps]);

  const slippageBpsRef = useRef(selectedSlippageBps);

  useEffect(() => {
    slippageBpsRef.current = selectedSlippageBps;
  }, [selectedSlippageBps]);

  useEffect(() => {
    setSwapRate((prev) => {
      if (!prev.optimalRateData && !prev.inputAmount) {
        return prev;
      }

      const amountForMax =
        prev.inputAmount || prev.optimalRateData?.srcAmount || '0';
      const nextMaxInput = maxInputAmountWithSlippage(
        amountForMax,
        selectedSlippageBps
      );

      if (
        prev.slippageBps === selectedSlippageBps &&
        prev.maxInputAmountWithSlippage === nextMaxInput
      ) {
        return prev;
      }

      return {
        ...prev,
        slippageBps: selectedSlippageBps,
        maxInputAmountWithSlippage: nextMaxInput,
      };
    });
  }, [selectedSlippageBps, setSwapRate]);

  return {
    slippage,
    setSlippage,
    autoSlippage,
    setAutoSlippage,
    isCustomSlippage,
    setIsCustomSlippage,
    displaySlippage,
    slippageBpsRef,
  };
};

export const useHFForDebtSwap = ({
  fromToken,
  toToken,
  fromAmount,
  toAmount,
}: {
  fromToken: SwappableToken;
  toToken?: SwappableToken;
  fromAmount: string;
  toAmount: string;
}) => {
  const { iUserSummary: user } = useLendingSummary();
  const {
    fromReserve,
    fromDisplayReserve,
    toReserve,
    toDisplayReserve,
  } = useSwapReserves({
    fromToken,
    toToken,
  });

  const afterSwapInfo = useMemo(() => {
    if (
      !fromDisplayReserve ||
      !toDisplayReserve ||
      !fromReserve ||
      !toReserve ||
      !user
    ) {
      return undefined;
    }

    return calculateHFAfterSwap({
      fromAmount: toAmount,
      fromAssetData: toReserve,
      fromAssetUserData: toDisplayReserve,
      toAmountAfterSlippage: fromAmount,
      toAssetData: fromReserve,
      user,
      fromAssetType: 'debt',
      toAssetType: 'debt',
    });
  }, [
    fromAmount,
    fromDisplayReserve,
    fromReserve,
    toAmount,
    toDisplayReserve,
    toReserve,
    user,
  ]);

  const isHFLow = useMemo(() => {
    const hfAfterSwap = afterSwapInfo?.hfAfterSwap;
    if (!hfAfterSwap) {
      return false;
    }

    const hfNumber = valueToBigNumber(hfAfterSwap);

    if (hfNumber.lt(0)) {
      return false;
    }

    return (
      hfNumber.lt(LIQUIDATION_SAFETY_THRESHOLD) &&
      hfNumber.gte(LIQUIDATION_DANGER_THRESHOLD)
    );
  }, [afterSwapInfo?.hfAfterSwap]);

  const isLiquidatable = useMemo(() => {
    if (!afterSwapInfo?.hfAfterSwap) {
      return false;
    }

    return valueToBigNumber(afterSwapInfo.hfAfterSwap).lt(
      LIQUIDATION_DANGER_THRESHOLD
    );
  }, [afterSwapInfo?.hfAfterSwap]);

  return {
    currentHF: user?.healthFactor,
    afterSwapInfo,
    isHFLow,
    isLiquidatable,
  };
};
