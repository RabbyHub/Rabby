import { useMemo } from 'react';
import { useRabbySelector } from '@/ui/store';
import { usePerpsAccount } from '@/ui/views/Perps/hooks/usePerpsAccount';
import {
  getSpotBalanceKey,
  PerpsQuoteAsset,
  SWAP_REQUIRED_QUOTE_ASSETS,
} from '@/ui/views/Perps/constants';
import usePerpsPopupNav from '../../../hooks/usePerpsPopupNav';
import { usePerpsProState } from '../../../hooks/usePerpsProState';
import { OrderSide } from '../../../types';

/**
 * Single source of truth for trading-panel gate decisions:
 * needDepositFirst > needSwapStableCoin (parallels what UI buttons + the
 * funds row both have to evaluate). Reads everything from redux/usePerpsAccount
 * so callers don't have to thread props through.
 *
 * `orderSide` narrows the deposit-first check to one direction's tradable
 * balance; omit it for combined buy/sell checks.
 */
export const usePerpsTradingGate = ({
  orderSide,
}: { orderSide?: OrderSide } = {}) => {
  const { openPerpsPopup } = usePerpsPopupNav();

  const clearinghouseState = useRabbySelector(
    (s) => s.perps.clearinghouseState
  );
  const wsActiveAssetData = useRabbySelector((s) => s.perps.wsActiveAssetData);
  const selectedCoin = useRabbySelector((s) => s.perps.selectedCoin);
  const marketDataMap = useRabbySelector((s) => s.perps.marketDataMap);

  const { accountValue, isUnifiedAccount, spotBalancesMap } = usePerpsAccount();
  const { needEnableTrading, handleActionApproveStatus } = usePerpsProState();

  const quoteAsset: PerpsQuoteAsset = (marketDataMap[selectedCoin]
    ?.quoteAsset ?? 'USDC') as PerpsQuoteAsset;

  const currentAssetBalance = Number(
    spotBalancesMap[getSpotBalanceKey(quoteAsset)]?.available || 0
  );

  const needDepositFirst = useMemo(() => {
    if (!clearinghouseState || accountValue !== 0) return false;
    const buyAvailable = Number(wsActiveAssetData?.availableToTrade[0] || 0);
    const sellAvailable = Number(wsActiveAssetData?.availableToTrade[1] || 0);
    if (orderSide === OrderSide.BUY) return buyAvailable === 0;
    if (orderSide === OrderSide.SELL) return sellAvailable === 0;
    return buyAvailable === 0 && sellAvailable === 0;
  }, [
    clearinghouseState,
    accountValue,
    wsActiveAssetData?.availableToTrade,
    orderSide,
  ]);

  const needSwapStableCoin = useMemo(() => {
    return (
      SWAP_REQUIRED_QUOTE_ASSETS.includes(quoteAsset) &&
      currentAssetBalance < 0.1
    );
  }, [quoteAsset, currentAssetBalance]);

  /**
   * Open the swap popup pre-targeted at the current market's quote, locked so
   * the user must complete USDC → quoteAsset. For non-unified accounts this
   * chains through enable-unified first.
   */
  const openSwapForCurrentQuote = () => {
    const target = quoteAsset === 'USDC' ? undefined : quoteAsset;
    if (!isUnifiedAccount) {
      openPerpsPopup('enable-unified', {
        next: 'swap',
        target,
        disableSwitch: true,
      });
    } else {
      openPerpsPopup('swap', { target, disableSwitch: true });
    }
  };

  return {
    quoteAsset,
    currentAssetBalance,
    needDepositFirst,
    needEnableTrading,
    needSwapStableCoin,
    isUnifiedAccount,
    openSwapForCurrentQuote,
    handleActionApproveStatus,
    openPerpsPopup,
  };
};
