import React from 'react';
import { useTranslation } from 'react-i18next';
import { splitNumberByStep } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { ReactComponent as RcIconAddDeposit } from '@/ui/assets/perps/IconAddDeposit.svg';
import { ReactComponent as RcIconSwitchCC } from '@/ui/assets/perps/IconSwitchCC.svg';
import { usePerpsTradingGate } from '../hooks/usePerpsTradingGate';

interface AvailableFundsProps {
  availableBalance: number;
  quoteAsset?: string;
}

export const OrderSideAndFunds: React.FC<AvailableFundsProps> = ({
  availableBalance,
  quoteAsset,
}) => {
  const { t } = useTranslation();
  const {
    needDepositFirst,
    needEnableTrading,
    openSwapForCurrentQuote,
    openPerpsPopup,
  } = usePerpsTradingGate();

  const currentNeedSwap = quoteAsset !== 'USDC';

  const handleDepositClick = () => {
    // Priority matches TradingButtons: deposit > enable-trading > swap.
    // Without funds, swapping is meaningless — must deposit first.
    // While enable-trading is pending, the swap entry is suppressed (the
    // dedicated enable-trading button handles that step).
    if (needDepositFirst) {
      openPerpsPopup('deposit');
      return;
    }
    if (needEnableTrading) {
      openPerpsPopup('deposit');
      return;
    }
    if (currentNeedSwap) {
      openSwapForCurrentQuote();
      return;
    }
    openPerpsPopup('deposit');
  };

  const showSwapIcon = !needDepositFirst && !needEnableTrading;

  return (
    <div className="flex items-center justify-between">
      <span className="text-rb-neutral-secondary text-[12px]">
        {t('page.perpsPro.tradingPanel.availableFunds')}
      </span>
      <span
        className="text-rb-neutral-title-1 text-[12px] font-medium flex items-center gap-[4px] cursor-pointer"
        onClick={handleDepositClick}
      >
        {splitNumberByStep(
          new BigNumber(availableBalance).toFixed(2, BigNumber.ROUND_DOWN)
        )}{' '}
        {quoteAsset || 'USDC'}
        {showSwapIcon ? (
          /* Quote needs a swap and user has none of it — surface the swap entry. */
          <RcIconSwitchCC className="text-rb-neutral-foot" />
        ) : (
          <RcIconAddDeposit />
        )}
      </span>
    </div>
  );
};
