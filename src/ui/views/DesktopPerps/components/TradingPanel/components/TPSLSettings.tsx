import React, { useEffect } from 'react';
import { TPSLConfig, OrderSide } from '../../../types';
import { formatTpOrSlPrice, validatePriceInput } from '@/ui/views/Perps/utils';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { DesktopPerpsInput } from '../../DesktopPerpsInput';

interface TPSLSettingsProps {
  config: TPSLConfig;
  setConfig: (config: TPSLConfig) => void;
  szDecimals: number;
  orderSide: OrderSide;
  price: number | string;
  leverage: number;
  priceChangeUpdate?: boolean;
}

export const TPSLSettings: React.FC<TPSLSettingsProps> = ({
  config,
  setConfig,
  szDecimals,
  orderSide,
  price,
  leverage,
  priceChangeUpdate = false,
}) => {
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
        // expectedPnL: string;
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

      if (field === 'price' && value && price) {
        // Price → Percentage
        const targetPrice = Number(value);
        const side = orderSide === OrderSide.BUY ? 1 : -1;
        const priceDiff = (targetPrice - Number(price)) / Number(price);
        // Take Profit: positive percentage for profit
        // Stop Loss: negative percentage (inherently negative)
        const pnlPercent =
          type === 'takeProfit'
            ? priceDiff * 100 * leverage * side
            : -priceDiff * 100 * leverage * side;
        newConfig.percentage = pnlPercent.toFixed(2);
      } else if (field === 'percentage' && value && price) {
        // Percentage → Price
        const pnlPercent = Number(value);
        const side = orderSide === OrderSide.BUY ? 1 : -1;
        // Take Profit: percentage is positive, add to price
        // Stop Loss: percentage is negative (inherently), subtract from price
        const targetPrice =
          type === 'takeProfit'
            ? Number(price) * (1 + ((pnlPercent / 100) * side) / leverage)
            : Number(price) * (1 - ((pnlPercent / 100) * side) / leverage);

        newConfig.price =
          targetPrice > 0 ? formatTpOrSlPrice(targetPrice, szDecimals) : '';
      }

      if (value === '') {
        newConfig.error = '';
        newConfig.price = '';
        newConfig.percentage = '';
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

  // Update both TP and SL in a single setConfig call to avoid race conditions
  const handleBothTPSLPercentageChange = useMemoizedFn(
    (tpPercentage: string | null, slPercentage: string | null) => {
      const newConfig = { ...config };

      // Process Take Profit
      if (tpPercentage !== null && price) {
        const tpConfig = { ...config.takeProfit };
        tpConfig.percentage = tpPercentage;

        if (tpPercentage && Number(tpPercentage)) {
          const pnlPercent = Number(tpPercentage);
          const side = orderSide === OrderSide.BUY ? 1 : -1;
          const targetPrice =
            Number(price) * (1 + ((pnlPercent / 100) * side) / leverage);
          tpConfig.price =
            targetPrice > 0 ? formatTpOrSlPrice(targetPrice, szDecimals) : '';
        }

        if (tpPercentage === '') {
          tpConfig.error = '';
          tpConfig.price = '';
          tpConfig.percentage = '';
        }

        newConfig.takeProfit = handleTPSLConfigValidation(
          'takeProfit',
          tpConfig
        );
      }

      // Process Stop Loss
      if (slPercentage !== null && price) {
        const slConfig = { ...config.stopLoss };
        slConfig.percentage = slPercentage;

        if (slPercentage && Number(slPercentage)) {
          const pnlPercent = Number(slPercentage);
          const side = orderSide === OrderSide.BUY ? 1 : -1;
          const targetPrice =
            Number(price) * (1 - ((pnlPercent / 100) * side) / leverage);
          slConfig.price =
            targetPrice > 0 ? formatTpOrSlPrice(targetPrice, szDecimals) : '';
        }

        if (slPercentage === '') {
          slConfig.error = '';
          slConfig.price = '';
          slConfig.percentage = '';
        }

        newConfig.stopLoss = handleTPSLConfigValidation('stopLoss', slConfig);
      }

      setConfig(newConfig);
    }
  );

  const handleTPPriceChange = useMemoizedFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (validatePriceInput(value, szDecimals)) {
        handleTakeProfitChange('price', value);
      }
    }
  );

  const handleTPPercentageChange = useMemoizedFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (validatePercentageInput(value)) {
        handleTakeProfitChange('percentage', value);
      }
    }
  );

  const handleSLPriceChange = useMemoizedFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (validatePriceInput(value, szDecimals)) {
        handleStopLossChange('price', value);
      }
    }
  );

  const handleSLPercentageChange = useMemoizedFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (validatePercentageInput(value)) {
        handleStopLossChange('percentage', value);
      }
    }
  );

  useEffect(() => {
    if (priceChangeUpdate && Number(price) > 0) {
      const slPercentage = Number(config.stopLoss.percentage)
        ? config.stopLoss.percentage
        : null;
      const tpPercentage = Number(config.takeProfit.percentage)
        ? config.takeProfit.percentage
        : null;

      if (slPercentage !== null || tpPercentage !== null) {
        handleBothTPSLPercentageChange(tpPercentage, slPercentage);
      }
    }
  }, [price]);

  return (
    <div className="space-y-[12px]">
      {/* TP Row */}
      <div className="space-y-[4px]">
        <div className="flex items-center gap-[8px]">
          <DesktopPerpsInput
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
