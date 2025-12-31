import React from 'react';
import { TPSLConfig, OrderSide } from '../../../types';
import { formatTpOrSlPrice, validatePriceInput } from '@/ui/views/Perps/utils';
import clsx from 'clsx';
import { useMemoizedFn } from 'ahooks';
import { calculatePnL } from '../utils';
import { formatPnL } from '../utils';
import { calculateTargetPrice } from '../utils';
import { useTranslation } from 'react-i18next';
import { DesktopPerpsInput } from '../../DesktopPerpsInput';

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
          <DesktopPerpsInput
            disabled={noSizeTradeAmount}
            prefix={
              <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                TP
              </span>
            }
            value={config.takeProfit.price}
            onChange={handleTPPriceChange}
            className="text-right"
          />
          <DesktopPerpsInput
            disabled={noSizeTradeAmount}
            prefix={
              <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                Gain
              </span>
            }
            suffix={
              <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                %
              </span>
            }
            value={config.takeProfit.percentage}
            onChange={handleTPPercentageChange}
            className="text-right"
          />
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
          <DesktopPerpsInput
            disabled={noSizeTradeAmount}
            prefix={
              <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                SL
              </span>
            }
            value={config.stopLoss.price}
            onChange={handleSLPriceChange}
            className="text-right"
          />
          <DesktopPerpsInput
            disabled={noSizeTradeAmount}
            prefix={
              <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                Loss
              </span>
            }
            suffix={
              <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                %
              </span>
            }
            value={config.stopLoss.percentage}
            onChange={handleSLPercentageChange}
            className="text-right"
          />
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
