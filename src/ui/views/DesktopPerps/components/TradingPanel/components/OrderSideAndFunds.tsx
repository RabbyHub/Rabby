import React from 'react';
import { useTranslation } from 'react-i18next';
import { splitNumberByStep } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { useHistory, useLocation } from 'react-router-dom';
import { ReactComponent as RcIconAddDeposit } from '@/ui/assets/perps/IconAddDeposit.svg';
import { ReactComponent as RcIconSwitchCC } from '@/ui/assets/perps/IconSwitchCC.svg';
import usePerpsPopupNav from '../../../hooks/usePerpsPopupNav';
import { usePerpsAccount } from '@/ui/views/Perps/hooks/usePerpsAccount';
import { PerpsQuoteAsset } from '@/ui/views/Perps/constants';
interface AvailableFundsProps {
  availableBalance: number;
  quoteAsset?: string;
}

export const OrderSideAndFunds: React.FC<AvailableFundsProps> = ({
  availableBalance,
  quoteAsset,
}) => {
  const { t } = useTranslation();
  const { openPerpsPopup } = usePerpsPopupNav();
  const { isUnifiedAccount } = usePerpsAccount();
  const handleSwapStableCoinClick = () => {
    if (!isUnifiedAccount) {
      openPerpsPopup('enable-unified', {
        next: 'swap',
        target: quoteAsset as PerpsQuoteAsset,
      });
    } else {
      openPerpsPopup('swap', { target: quoteAsset as PerpsQuoteAsset });
    }
  };

  const handleDepositClick = () => {
    if (quoteAsset !== 'USDC') {
      handleSwapStableCoinClick();
      return;
    }

    openPerpsPopup('deposit');
  };

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
        {quoteAsset === 'USDC' ? (
          <RcIconAddDeposit />
        ) : (
          /* If it's not USDC, show the switch icon to indicate they can switch to USDC */
          <RcIconSwitchCC className="text-rb-neutral-foot" />
        )}
      </span>
    </div>
  );
};
