import React from 'react';
import { useTranslation } from 'react-i18next';
import { splitNumberByStep } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { useHistory, useLocation } from 'react-router-dom';
import { ReactComponent as RcIconAddDeposit } from '@/ui/assets/perps/IconAddDeposit.svg';

interface AvailableFundsProps {
  availableBalance: number;
}

export const OrderSideAndFunds: React.FC<AvailableFundsProps> = ({
  availableBalance,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();

  const handleDepositClick = () => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('action', 'deposit');
    history.push({
      pathname: location.pathname,
      search: searchParams.toString(),
    });
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
        {'USDC'}
        <RcIconAddDeposit />
      </span>
    </div>
  );
};
