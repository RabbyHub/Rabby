import React from 'react';
import { TPSLConfig, OrderSide } from '../../../types';
import { formatTpOrSlPrice, validatePriceInput } from '@/ui/views/Perps/utils';
import clsx from 'clsx';
import { useMemoizedFn } from 'ahooks';
import { calculatePnL } from '../utils';
import { formatPnL } from '../utils';
import { calculateTargetPrice } from '../utils';
import { useTranslation } from 'react-i18next';

interface TPSLSettingsProps {
  config: TPSLConfig;
  setConfig: (config: TPSLConfig) => void;
  szDecimals: number;
  orderSide: OrderSide;
  tradeSize: string;
  price: number | string;
  marginRequired: number;
}

export const TPSLSettings: React.FC<TPSLSettingsProps> = ({
  config,
  setConfig,
  szDecimals,
  orderSide,
  tradeSize,
  price,
  marginRequired,
}) => {
  const noSizeTradeAmount = React.useMemo(() => {
    return Number(tradeSize) === 0;
  }, [tradeSize]);

  const { t } = useTranslation();
  const validatePercentageInput = (value: string): boolean => {
    // Allow empty, numbers, decimal point, and minus sign at the start
    return value === '' || /^-?\d*\.?\d*$/.test(value);
  };

  const handleTPSLConfigValidation = useMemoizedFn(
    (
      type: 'takeProfit' | 'stopLoss',
      currentConfig: {
        price: string;
        percentage: string;
        expectedPnL: string;
        error: string;
      }
    ) => {
      const direction = orderSide === OrderSide.BUY ? 'Long' : 'Short';
      const currentPrice = Number(currentConfig.price);
      // init error
      currentConfig.error = '';
      if (type === 'takeProfit' && currentPrice) {
        if (direction === 'Long' && currentPrice <= Number(price)) {
          currentConfig.error = t(
            'page.perpsPro.tradingPanel.tpMustBeHigherThanCurrentPrice'
          );
        }
        if (direction === 'Short' && currentPrice >= Number(price)) {
          currentConfig.error = t(
            'page.perpsPro.tradingPanel.tpMustBeLowerThanCurrentPrice'
          );
        }
      } else if (type === 'stopLoss' && currentPrice) {
        if (direction === 'Long' && currentPrice >= Number(price)) {
          currentConfig.error = t(
            'page.perpsPro.tradingPanel.slMustBeLowerThanCurrentPrice'
          );
        }
        if (direction === 'Short' && currentPrice <= Number(price)) {
          currentConfig.error = t(
            'page.perpsPro.tradingPanel.slMustBeHigherThanCurrentPrice'
          );
        }
      }
      return currentConfig;
    }
  );

  const createTPSLChangeHandler = useMemoizedFn(
    (type: 'takeProfit' | 'stopLoss') => (
      field: 'price' | 'percentage',
      value: string
    ) => {
      const currentConfig = config[type];
      const newConfig = {
        ...currentConfig,
        [field]: value,
      };

      const direction = orderSide === OrderSide.BUY ? 'Long' : 'Short';
      const size = Number(tradeSize);

      if (field === 'price' && value && price && size) {
        // Price → Percentage
        const targetPrice = Number(value);
        const pnl = calculatePnL(targetPrice, direction, size, Number(price));
        newConfig.expectedPnL = formatPnL(pnl);

        const pnlPercent = (pnl / marginRequired) * 100;
        newConfig.percentage = pnlPercent.toFixed(2);
      } else if (field === 'percentage' && value && price && size) {
        // Percentage → Price
        const pnlPercent = Number(value);
        const pnl = (pnlPercent * marginRequired) / 100;
        const targetPrice = calculateTargetPrice(
          pnl,
          direction,
          size,
          Number(price)
        );

        newConfig.price =
          targetPrice > 0 ? formatTpOrSlPrice(targetPrice, szDecimals) : '';
        newConfig.expectedPnL = formatPnL(pnl);
      }

      if (value === '') {
        newConfig.error = '';
        newConfig.price = '';
        newConfig.percentage = '';
        newConfig.expectedPnL = '';
      }

      setConfig({
        ...config,
        [type]: handleTPSLConfigValidation(type, newConfig),
      });
    }
  );

  const handleTakeProfitChange = useMemoizedFn(
    createTPSLChangeHandler('takeProfit')
  );

  const handleStopLossChange = useMemoizedFn(
    createTPSLChangeHandler('stopLoss')
  );

  const handleTPPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePriceInput(value, szDecimals)) {
      handleTakeProfitChange('price', value);
    }
  };

  const handleTPPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePercentageInput(value)) {
      handleTakeProfitChange('percentage', value);
    }
  };

  const handleSLPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePriceInput(value, szDecimals)) {
      handleStopLossChange('price', value);
    }
  };

  const handleSLPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePercentageInput(value)) {
      handleStopLossChange('percentage', value);
    }
  };

  return (
    <div className="space-y-[12px]">
      {/* TP Row */}
      <div className="space-y-[4px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex-1">
            <div className="relative">
              <input
                disabled={noSizeTradeAmount}
                type="text"
                value={config.takeProfit.price}
                onChange={handleTPPriceChange}
                placeholder=""
                className={clsx(
                  'w-full h-[40px] pl-[32px] pr-[12px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid text-[13px] focus:outline-none font-medium text-right',
                  config.takeProfit.error
                    ? 'border-rb-red-default text-rb-red-default'
                    : 'border-rb-neutral-line text-r-neutral-title-1'
                )}
              />
              <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
                TP
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="relative">
              <input
                disabled={noSizeTradeAmount}
                type="text"
                value={config.takeProfit.percentage}
                onChange={handleTPPercentageChange}
                placeholder=""
                className="w-full h-[40px] pl-[44px] pr-[24px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid border-rb-neutral-line text-r-neutral-title-1 text-[13px] focus:outline-none font-medium text-right"
              />
              <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
                Gain
              </div>
              <div className="absolute right-[8px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
                %
              </div>
            </div>
          </div>
        </div>
        {config.takeProfit.error && (
          <div className="text-[12px] text-rb-red-default px-[4px]">
            {config.takeProfit.error}
          </div>
        )}
      </div>

      {/* SL Row */}
      <div className="space-y-[4px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex-1">
            <div className="relative">
              <input
                disabled={noSizeTradeAmount}
                type="text"
                value={config.stopLoss.price}
                onChange={handleSLPriceChange}
                placeholder=""
                className={clsx(
                  'w-full h-[40px] pl-[32px] pr-[12px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid text-[13px] focus:outline-none font-medium text-right',
                  config.stopLoss.error
                    ? 'border-rb-red-default text-rb-red-default'
                    : 'border-rb-neutral-line text-r-neutral-title-1'
                )}
              />
              <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
                SL
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="relative">
              <input
                disabled={noSizeTradeAmount}
                type="text"
                value={config.stopLoss.percentage}
                onChange={handleSLPercentageChange}
                placeholder=""
                className="w-full h-[40px] pl-[44px] pr-[24px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid border-rb-neutral-line text-r-neutral-title-1 text-[13px] focus:outline-none font-medium text-right"
              />
              <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
                Loss
              </div>
              <div className="absolute right-[8px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
                %
              </div>
            </div>
          </div>
        </div>
        {config.stopLoss.error && (
          <div className="text-[12px] text-rb-red-default px-[4px]">
            {config.stopLoss.error}
          </div>
        )}
      </div>
    </div>
  );
};
