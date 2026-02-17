import React, { useMemo } from 'react';
import { OrderSide, Position } from '../../../types';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { formatPerpsCoin } from '../../../utils';
import { useHistory, useLocation } from 'react-router-dom';
import { ReactComponent as RcIconAddDeposit } from '@/ui/assets/perps/IconAddDeposit.svg';

interface OrderSideAndFundsProps {
  orderSide: OrderSide;
  switchOrderSide: (side: OrderSide) => void;
  availableBalance: number;
  currentPosition: Position | null;
  selectedCoin: string;
}

export const OrderSideAndFunds: React.FC<OrderSideAndFundsProps> = ({
  orderSide,
  switchOrderSide,
  availableBalance,
  currentPosition,
  selectedCoin,
}) => {
  const { t } = useTranslation();
  const needShowDeposit = useMemo(() => {
    return Number(availableBalance) === 0;
  }, [availableBalance]);

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
    <>
      <div className="flex items-center gap-[8px]">
        <button
          onClick={() => switchOrderSide(OrderSide.BUY)}
          className={`flex-1 h-[32px] rounded-[8px] font-medium text-[12px] transition-colors ${
            orderSide === OrderSide.BUY
              ? 'bg-rb-green-default text-rb-neutral-InvertHighlight '
              : 'hover:border-rb-brand-default border border-solid border-transparent  bg-rb-neutral-bg-2 text-rb-neutral-title-1'
          }`}
        >
          {t('page.perpsPro.tradingPanel.buyLong')}
        </button>
        <button
          onClick={() => switchOrderSide(OrderSide.SELL)}
          className={`flex-1 h-[32px] rounded-[8px] font-medium text-[12px] transition-colors ${
            orderSide === OrderSide.SELL
              ? 'bg-rb-red-default text-rb-neutral-InvertHighlight '
              : 'hover:border-rb-brand-default border border-solid border-transparent bg-rb-neutral-bg-2 text-rb-neutral-title-1'
          }`}
        >
          {t('page.perpsPro.tradingPanel.sellShort')}
        </button>
      </div>

      {/* Available Funds & Current Position */}
      <div className="space-y-[4px]">
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[12px]">
            {t('page.perpsPro.tradingPanel.availableFunds')}
          </span>
          <span
            className={clsx(
              'text-r-neutral-title-1 text-[12px] font-medium flex items-center gap-[4px]',
              {
                'cursor-pointer': needShowDeposit,
              }
            )}
            onClick={() => {
              if (needShowDeposit) {
                handleDepositClick();
              }
            }}
          >
            {splitNumberByStep(
              new BigNumber(availableBalance).toFixed(2, BigNumber.ROUND_DOWN)
            )}{' '}
            {'USDC'}
            {needShowDeposit && <RcIconAddDeposit />}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[12px]">
            {t('page.perpsPro.tradingPanel.currentPosition')}
          </span>
          <span
            className={clsx(
              'text-r-neutral-title-1 text-[12px] font-medium',
              {
                Long: 'text-rb-green-default',
                Short: 'text-rb-red-default',
              }[currentPosition?.side || '']
            )}
          >
            {currentPosition
              ? `${currentPosition.size} ${formatPerpsCoin(selectedCoin)}`
              : `0 ${formatPerpsCoin(selectedCoin)}`}
          </span>
        </div>
      </div>
    </>
  );
};
