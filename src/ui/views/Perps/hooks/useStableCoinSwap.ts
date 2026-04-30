import { message } from 'antd';
import { useMemoizedFn } from 'ahooks';
import BigNumber from 'bignumber.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ALL_PERPS_QUOTE_ASSETS,
  PERPS_MIN_SWAP_AMOUNT,
  PerpsQuoteAsset,
  SPOT_STABLE_COIN_NAME,
  STABLECOIN_SLIPPAGE,
  getSpotBalanceKey,
} from '../constants';
import { usePerpsAccount } from './usePerpsAccount';
import { usePerpsSpotMids } from './usePerpsSpotMids';

export type StableCoinOrderFn = (params: {
  coin: 'USDT' | 'USDH' | 'USDE';
  isBuy: boolean;
  size: string;
  limitPx: string;
}) => Promise<boolean | undefined>;

export interface UseStableCoinSwapOptions {
  visible: boolean;
  /** When provided, locks target side; user must swap USDC → targetAsset. */
  targetAsset?: PerpsQuoteAsset;
  /** When provided, seeds the from side; pairs with USDC on the other side. */
  sourceAsset?: PerpsQuoteAsset;
  /** Submit handler — usePerpsPosition / usePerpsProPosition both expose one. */
  handleStableCoinOrder: StableCoinOrderFn;
  onSuccess?: () => void;
  onClose: () => void;
}

export const useStableCoinSwap = ({
  visible,
  targetAsset,
  sourceAsset,
  handleStableCoinOrder,
  onSuccess,
  onClose,
}: UseStableCoinSwapOptions) => {
  const { t } = useTranslation();
  const { spotBalancesMap, getSpotBalance } = usePerpsAccount();
  const midPrices = usePerpsSpotMids(visible);

  const [fromCoin, setFromCoin] = useState<PerpsQuoteAsset>('USDC');
  const [toCoin, setToCoin] = useState<PerpsQuoteAsset>('USDT');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Snapshot balances so the seed effect doesn't refire on each WS tick
  // (which would wipe the user's typed amount).
  const balancesRef = useRef(spotBalancesMap);
  balancesRef.current = spotBalancesMap;

  useEffect(() => {
    if (!visible) return;
    if (targetAsset) {
      setFromCoin('USDC');
      setToCoin(targetAsset);
    } else if (sourceAsset) {
      setFromCoin(sourceAsset);
      setToCoin(sourceAsset === 'USDC' ? 'USDT' : 'USDC');
    } else {
      const sorted = ALL_PERPS_QUOTE_ASSETS.map((c) => ({
        coin: c,
        bal: Number(balancesRef.current[getSpotBalanceKey(c)]?.available || 0),
      }))
        .filter((i) => i.bal > 0)
        .sort((a, b) => b.bal - a.bal);
      if (sorted.length === 0) {
        setFromCoin('USDC');
        setToCoin('USDT');
      } else if (sorted[0].coin === 'USDC') {
        // USDC has the most balance — keep USDC as `from`, pick the next
        // non-USDC stablecoin as `to` (USDT fallback if nothing else).
        setFromCoin('USDC');
        const nextNonUsdc = sorted.find((i) => i.coin !== 'USDC');
        setToCoin(nextNonUsdc?.coin || 'USDT');
      } else {
        // Top is non-USDC — user is more likely selling it. Pair with USDC
        // on the other side (SDK only supports X ↔ USDC).
        setFromCoin(sorted[0].coin);
        setToCoin('USDC');
      }
    }
    setAmount('');
  }, [visible, targetAsset, sourceAsset]);

  const fromBalanceStr = useMemo(
    () => spotBalancesMap[getSpotBalanceKey(fromCoin)]?.available || '0',
    [fromCoin, spotBalancesMap]
  );
  const fromBalanceBN = useMemo(() => new BigNumber(fromBalanceStr), [
    fromBalanceStr,
  ]);

  const amountBN = useMemo(() => new BigNumber(amount || 0), [amount]);

  // Mid price for the current non-USDC leg (1 fallback — limitPx is an
  // upper/lower bound, real fill is matched against the orderbook).
  const midBN = useMemo(() => {
    if (fromCoin === toCoin) return new BigNumber(1);
    const nonUsdc = fromCoin === 'USDC' ? toCoin : fromCoin;
    if (nonUsdc === 'USDC') return new BigNumber(1);
    const spotName =
      SPOT_STABLE_COIN_NAME[nonUsdc as Exclude<PerpsQuoteAsset, 'USDC'>];
    const raw = midPrices[spotName] || midPrices[nonUsdc] || '1';
    const n = new BigNumber(raw);
    return n.isFinite() && n.gt(0) ? n : new BigNumber(1);
  }, [fromCoin, toCoin, midPrices]);

  const receiveAmountStr = useMemo(() => {
    if (amountBN.lte(0)) return '0';
    const isBuy = fromCoin === 'USDC';
    const converted = isBuy ? amountBN.dividedBy(midBN) : amountBN.times(midBN);
    return converted.decimalPlaces(4, BigNumber.ROUND_DOWN).toFixed();
  }, [amountBN, midBN, fromCoin]);

  const errorMessage = useMemo(() => {
    if (!amount) return '';
    if (amountBN.lt(PERPS_MIN_SWAP_AMOUNT))
      return t('page.perps.PerpsSpotSwap.minimumAmount', {
        amount: PERPS_MIN_SWAP_AMOUNT,
      });
    if (amountBN.gt(fromBalanceBN))
      return t('page.perps.PerpsSpotSwap.insufficientBalance');
    return '';
  }, [amount, amountBN, fromBalanceBN, t]);

  // SDK stableCoinOrder supports only X ↔ USDC pairs.
  const invalidPair = useMemo(() => {
    if (fromCoin === toCoin) return true;
    if (fromCoin !== 'USDC' && toCoin !== 'USDC') return true;
    return false;
  }, [fromCoin, toCoin]);

  const canSubmit =
    !invalidPair && !errorMessage && amountBN.gt(0) && !submitting;

  // SDK only supports X ↔ USDC. When the user picks a non-USDC token on one
  // side, the other side is forced back to USDC. If both sides become USDC
  // (e.g. user picked USDC where the other side was already USDC), bump the
  // opposite side to USDT.
  const handleFromChange = useMemoizedFn((v: PerpsQuoteAsset) => {
    setFromCoin(v);
    if (v !== 'USDC') {
      setToCoin('USDC');
    } else if (v === toCoin) {
      setToCoin('USDT');
    }
  });

  const handleToChange = useMemoizedFn((v: PerpsQuoteAsset) => {
    setToCoin(v);
    if (v !== 'USDC') {
      setFromCoin('USDC');
    } else if (v === fromCoin) {
      setFromCoin('USDT');
    }
  });

  const handlePercent = useMemoizedFn((pct: number) => {
    if (fromBalanceBN.lte(0)) return;
    setAmount(
      fromBalanceBN.times(pct).decimalPlaces(4, BigNumber.ROUND_DOWN).toFixed()
    );
  });

  const handleSwap = useMemoizedFn(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const isBuy = fromCoin === 'USDC';
      const nonUsdc = (isBuy ? toCoin : fromCoin) as 'USDT' | 'USDH' | 'USDE';
      const limitPx = isBuy
        ? midBN
            .times(new BigNumber(1).plus(STABLECOIN_SLIPPAGE))
            .decimalPlaces(4)
            .toFixed()
        : midBN
            .times(new BigNumber(1).minus(STABLECOIN_SLIPPAGE))
            .decimalPlaces(4)
            .toFixed();
      const size = isBuy
        ? amountBN
            .dividedBy(midBN)
            .decimalPlaces(2, BigNumber.ROUND_DOWN)
            .toFixed()
        : amountBN.decimalPlaces(2, BigNumber.ROUND_DOWN).toFixed();

      const ok = await handleStableCoinOrder({
        coin: nonUsdc,
        isBuy,
        size,
        limitPx,
      });
      if (ok) {
        message.success(t('page.perps.PerpsSpotSwap.swapSuccess'));
        onSuccess?.();
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  });

  const sortedCoins = useMemo(() => {
    return [...ALL_PERPS_QUOTE_ASSETS].sort(
      (a, b) => getSpotBalance(b) - getSpotBalance(a)
    );
  }, [getSpotBalance, spotBalancesMap]);

  return {
    fromCoin,
    toCoin,
    amount,
    setAmount,
    submitting,
    fromBalanceBN,
    amountBN,
    midBN,
    receiveAmountStr,
    errorMessage,
    invalidPair,
    canSubmit,
    sortedCoins,
    getSpotBalance,
    handleFromChange,
    handleToChange,
    handlePercent,
    handleSwap,
  };
};
