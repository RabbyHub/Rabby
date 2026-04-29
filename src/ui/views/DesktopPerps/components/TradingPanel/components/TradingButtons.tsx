import clsx from 'clsx';
import React, { useMemo, useState } from 'react';
import { Button } from 'antd';
import { useRabbySelector } from '@/ui/store';
import { useTranslation } from 'react-i18next';
import { RcIconInfoCC } from '@/ui/assets/desktop/common';
import { OrderSide } from '../../../types';
import { usePerpsTradingGate } from '../hooks/usePerpsTradingGate';

const PRIMARY_BTN_CLASS =
  'w-full h-[40px] rounded-[8px] font-medium text-[13px] border-transparent text-rb-neutral-InvertHighlight';

const useTradingGate = ({
  error,
  orderSide,
}: {
  error?: string;
  orderSide?: OrderSide;
}) => {
  const { t } = useTranslation();

  const {
    quoteAsset,
    needDepositFirst,
    needEnableTrading,
    needSwapStableCoin,
    openSwapForCurrentQuote,
    handleActionApproveStatus,
    openPerpsPopup,
  } = usePerpsTradingGate({ orderSide });

  const bannerNode = useMemo(() => {
    // Priority matches gateButton: needDepositFirst > needEnableTrading > needSwapStableCoin > error.
    // needEnableTrading suppresses the banner (the enable-trading button alone is enough),
    // but a pending deposit still needs the banner above it.
    if (needDepositFirst) {
      return (
        <div className="bg-r-orange-light rounded-[8px] px-[12px] py-[8px] flex items-center gap-[4px]">
          <RcIconInfoCC className="text-r-orange-default" />
          <div className="flex-1 text-left font-medium text-[12px] leading-[14px] text-r-orange-default">
            {t('page.perpsPro.tradingPanel.addFundsToGetStarted')}
          </div>
        </div>
      );
    }
    if (needEnableTrading) return null;
    if (!error && !needSwapStableCoin) return null;
    return (
      <div className="bg-r-orange-light rounded-[8px] px-[12px] py-[8px] flex items-center gap-[4px]">
        <RcIconInfoCC className="text-r-orange-default" />
        <div className="flex-1 text-left font-medium text-[12px] leading-[14px] text-r-orange-default">
          {needSwapStableCoin
            ? t('page.perps.PerpsSpotSwap.swapBeforeTrading', { quoteAsset })
            : error}
        </div>
      </div>
    );
  }, [
    error,
    needDepositFirst,
    needSwapStableCoin,
    quoteAsset,
    needEnableTrading,
    t,
  ]);

  const gateButton = useMemo(() => {
    if (needDepositFirst) {
      return (
        <Button
          type="primary"
          block
          size="large"
          onClick={() => openPerpsPopup('deposit')}
          className={PRIMARY_BTN_CLASS}
        >
          {t('page.perpsPro.tradingPanel.deposit')}
        </Button>
      );
    }
    if (needEnableTrading) {
      return (
        <Button
          type="primary"
          block
          size="large"
          onClick={() => handleActionApproveStatus()}
          className={PRIMARY_BTN_CLASS}
        >
          {t('page.perpsPro.tradingPanel.enableTrading')}
        </Button>
      );
    }
    if (needSwapStableCoin) {
      return (
        <Button
          type="primary"
          block
          size="large"
          onClick={openSwapForCurrentQuote}
          className={PRIMARY_BTN_CLASS}
        >
          {t('page.perpsPro.tradingPanel.swapStableCoins')}
        </Button>
      );
    }
    return null;
  }, [
    needDepositFirst,
    needEnableTrading,
    needSwapStableCoin,
    openSwapForCurrentQuote,
    openPerpsPopup,
    handleActionApproveStatus,
    t,
  ]);

  return { bannerNode, gateButton };
};

// === Pair: Buy / Sell — Market, Limit, TP/SL, TWAP containers ===
interface TradingButtonsProps {
  onBuyClick: () => void;
  onSellClick: () => void;
  buyLoading: boolean;
  sellLoading: boolean;
  buyDisabled: boolean;
  sellDisabled: boolean;
  buyError?: string;
  sellError?: string;
}

export const TradingButtons: React.FC<TradingButtonsProps> = ({
  onBuyClick,
  onSellClick,
  buyLoading,
  sellLoading,
  buyDisabled,
  sellDisabled,
  buyError,
  sellError,
}) => {
  const { t } = useTranslation();
  const hasPermission = useRabbySelector((s) => s.perps.hasPermission);
  const error = buyError || sellError;
  const { bannerNode, gateButton } = useTradingGate({ error });
  const [buyHovered, setBuyHovered] = useState(false);
  const [sellHovered, setSellHovered] = useState(false);

  return (
    <div className="flex flex-col gap-[12px]">
      {bannerNode}
      {gateButton ?? (
        <div className="flex items-center gap-[8px]">
          <Button
            type="primary"
            size="large"
            loading={buyLoading}
            onClick={onBuyClick}
            disabled={buyDisabled || !hasPermission}
            style={{
              boxShadow:
                buyHovered && !buyDisabled && !buyError
                  ? '0px 8px 16px rgba(42, 187, 127, 0.3)'
                  : 'none',
            }}
            onMouseEnter={() => setBuyHovered(true)}
            onMouseLeave={() => setBuyHovered(false)}
            className={clsx(
              'flex-1 h-[40px] rounded-[8px] font-medium text-[13px] border-transparent',
              'bg-rb-green-default text-rb-neutral-InvertHighlight',
              (buyDisabled || buyError || !hasPermission) &&
                'cursor-not-allowed'
            )}
          >
            {t('page.perpsPro.tradingPanel.buyLong')}
          </Button>

          <Button
            type="primary"
            size="large"
            loading={sellLoading}
            onClick={onSellClick}
            disabled={sellDisabled || !hasPermission}
            style={{
              boxShadow:
                sellHovered && !sellDisabled && !sellError
                  ? '0px 8px 16px rgba(227, 73, 53, 0.3)'
                  : 'none',
            }}
            onMouseEnter={() => setSellHovered(true)}
            onMouseLeave={() => setSellHovered(false)}
            className={clsx(
              'flex-1 h-[40px] rounded-[8px] font-medium text-[13px] border-transparent',
              'bg-rb-red-default text-rb-neutral-InvertHighlight',
              (sellDisabled || sellError || !hasPermission) &&
                'cursor-not-allowed'
            )}
          >
            {t('page.perpsPro.tradingPanel.sellShort')}
          </Button>
        </div>
      )}
    </div>
  );
};

// === Single direction — Scale container ===
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
  const hasPermission = useRabbySelector((s) => s.perps.hasPermission);
  const { bannerNode, gateButton } = useTradingGate({ error, orderSide });
  const [hovered, setHovered] = useState(false);

  return (
    <div className="flex flex-col gap-[12px]">
      {bannerNode}
      {gateButton ?? (
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
          className={clsx(
            'w-full h-[40px] rounded-[8px] font-medium text-[13px] border-transparent text-rb-neutral-InvertHighlight',
            !(isValid && !error && hasPermission) && 'cursor-not-allowed',
            orderSide === OrderSide.BUY
              ? 'bg-rb-green-default'
              : 'bg-rb-red-default'
          )}
        >
          {titleText}
        </Button>
      )}
    </div>
  );
};
