import React, { useMemo, useState } from 'react';
import { Button } from 'antd';
import { OrderSide } from '../../../types';
import { useRabbySelector } from '@/ui/store';
import { useTranslation } from 'react-i18next';
import { RcIconInfoCC } from '@/ui/assets/desktop/common';
import { useHistory, useLocation } from 'react-router-dom';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';

interface TradingButtonProps {
  loading: boolean;
  onClick: () => void;
  disabled: boolean;
  error?: string;
  isValid: boolean;
  orderSide: OrderSide;
  titleText: string;
}

export const TradingButton: React.FC<TradingButtonProps> = ({
  loading,
  onClick,
  disabled,
  error,
  isValid,
  orderSide,
  titleText,
}) => {
  const allDexsClearinghouseState = useRabbySelector(
    (store) => store.perps.allDexsClearinghouseState
  );

  const needDepositFirst = useMemo(() => {
    const accountValue =
      allDexsClearinghouseState?.reduce((acc, item) => {
        return acc + Number(item[1].marginSummary.accountValue || 0);
      }, 0) || 0;
    return accountValue === 0 && allDexsClearinghouseState.length > 0;
  }, [allDexsClearinghouseState]);

  const hasPermission = useRabbySelector((state) => state.perps.hasPermission);
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const location = useLocation();
  const history = useHistory();

  const {
    needEnableTrading,
    handleActionApproveStatus,
  } = usePerpsProPosition();

  const handleDepositClick = () => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('action', 'deposit');
    history.push({
      pathname: location.pathname,
      search: searchParams.toString(),
    });
  };

  return (
    <div className="flex flex-col gap-[12px]">
      {Boolean(error || needDepositFirst) && (
        <div className="bg-r-orange-light rounded-[8px] px-[12px] py-[8px] flex items-center gap-[4px]">
          <RcIconInfoCC className="text-r-orange-default" />
          <div className="flex-1 text-left font-medium text-[12px] leading-[14px] text-r-orange-default">
            {needDepositFirst
              ? t('page.perpsPro.tradingPanel.addFundsToGetStarted')
              : error}
          </div>
        </div>
      )}
      {needDepositFirst || needEnableTrading ? (
        <Button
          type="primary"
          block
          size="large"
          onClick={() => {
            if (needDepositFirst) {
              handleDepositClick();
            } else {
              handleActionApproveStatus();
            }
          }}
          className={
            'w-full h-[40px] rounded-[8px] font-medium text-[13px] border-transparent text-rb-neutral-InvertHighlight'
          }
        >
          {needDepositFirst
            ? t('page.perpsPro.tradingPanel.deposit')
            : t('page.perpsPro.tradingPanel.enableTrading')}
        </Button>
      ) : (
        <Button
          type="primary"
          block
          size="large"
          loading={loading}
          onClick={onClick}
          disabled={disabled || !hasPermission}
          style={{
            boxShadow:
              hovered && isValid && !error
                ? orderSide === OrderSide.BUY
                  ? '0px 8px 16px rgba(42, 187, 127, 0.3)'
                  : '0px 8px 16px rgba(227, 73, 53, 0.3)'
                : 'none',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`w-full h-[40px] rounded-[8px] font-medium text-[13px] border-transparent ${
            isValid && !error && hasPermission
              ? orderSide === OrderSide.BUY
                ? 'bg-rb-green-default text-rb-neutral-InvertHighlight'
                : 'bg-rb-red-default text-rb-neutral-InvertHighlight'
              : 'bg-rb-neutral-bg-2 text-rb-neutral-foot opacity-50 cursor-not-allowed'
          }`}
        >
          {titleText}
        </Button>
      )}
    </div>
  );
};
