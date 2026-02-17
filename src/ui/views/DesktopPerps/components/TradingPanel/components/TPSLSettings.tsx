import React, { useEffect, useRef } from 'react';
import { TPSLConfig, OrderSide, TPSLInputMode } from '../../../types';
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

  // Use ref to track if this is the first render (to skip initial effect)
  const isFirstRender = useRef(true);

  const validatePercentageInput = (value: string): boolean => {
    // Allow empty, numbers, decimal point, and minus sign at the start
    return value === '' || /^-?\d*\.?\d*$/.test(value);
  };

  const handleTPSLConfigValidation = useMemoizedFn(
    (
      type: 'takeProfit' | 'stopLoss',
      currentConfig: TPSLConfig['takeProfit'] | TPSLConfig['stopLoss']
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
      value: string,
      inputMode: TPSLInputMode
    ) => {
      const currentConfig = config[type];
      const newConfig = {
        ...currentConfig,
        [field]: value,
        inputMode, // Update inputMode based on which field user is editing
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

  const handleTPPriceChange = useMemoizedFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (validatePriceInput(value, szDecimals)) {
        // User is inputting price, set inputMode to 'price' in config
        handleTakeProfitChange('price', value, 'price');
      }
    }
  );

  const handleTPPercentageChange = useMemoizedFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (validatePercentageInput(value)) {
        // User is inputting percentage, set inputMode to 'percentage' in config
        handleTakeProfitChange('percentage', value, 'percentage');
      }
    }
  );

  const handleSLPriceChange = useMemoizedFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (validatePriceInput(value, szDecimals)) {
        // User is inputting price, set inputMode to 'price' in config
        handleStopLossChange('price', value, 'price');
      }
    }
  );

  const handleSLPercentageChange = useMemoizedFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (validatePercentageInput(value)) {
        // User is inputting percentage, set inputMode to 'percentage' in config
        handleStopLossChange('percentage', value, 'percentage');
      }
    }
  );

  // Recalculate percentage from price (for price input mode)
  const calcPercentageFromPrice = useMemoizedFn(
    (type: 'takeProfit' | 'stopLoss', tpSlPrice: string) => {
      if (!tpSlPrice || !price || !Number(tpSlPrice)) {
        return '';
      }
      const targetPrice = Number(tpSlPrice);
      const side = orderSide === OrderSide.BUY ? 1 : -1;
      const priceDiff = (targetPrice - Number(price)) / Number(price);
      const pnlPercent =
        type === 'takeProfit'
          ? priceDiff * 100 * leverage * side
          : -priceDiff * 100 * leverage * side;
      return pnlPercent.toFixed(2);
    }
  );

  // Recalculate price from percentage (for percentage input mode)
  const calcPriceFromPercentage = useMemoizedFn(
    (type: 'takeProfit' | 'stopLoss', percentage: string) => {
      if (!percentage || !price || !Number(percentage)) {
        return '';
      }
      const pnlPercent = Number(percentage);
      const side = orderSide === OrderSide.BUY ? 1 : -1;
      const targetPrice =
        type === 'takeProfit'
          ? Number(price) * (1 + ((pnlPercent / 100) * side) / leverage)
          : Number(price) * (1 - ((pnlPercent / 100) * side) / leverage);
      return targetPrice > 0 ? formatTpOrSlPrice(targetPrice, szDecimals) : '';
    }
  );

  // Handle price change based on input mode for both TP and SL
  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!priceChangeUpdate || Number(price) <= 0) {
      return;
    }

    const newConfig = { ...config };
    let hasChanges = false;

    // Handle Take Profit based on config.takeProfit.inputMode
    if (config.takeProfit.price || config.takeProfit.percentage) {
      const tpConfig = { ...config.takeProfit };

      if (tpConfig.inputMode === 'price' && config.takeProfit.price) {
        // User input price, recalculate percentage
        tpConfig.percentage = calcPercentageFromPrice(
          'takeProfit',
          config.takeProfit.price
        );
        hasChanges = true;
      } else if (
        tpConfig.inputMode === 'percentage' &&
        config.takeProfit.percentage
      ) {
        // User input percentage, recalculate price
        tpConfig.price = calcPriceFromPercentage(
          'takeProfit',
          config.takeProfit.percentage
        );
        hasChanges = true;
      }

      newConfig.takeProfit = handleTPSLConfigValidation('takeProfit', tpConfig);
    }

    // Handle Stop Loss based on config.stopLoss.inputMode
    if (config.stopLoss.price || config.stopLoss.percentage) {
      const slConfig = { ...config.stopLoss };

      if (slConfig.inputMode === 'price' && config.stopLoss.price) {
        // User input price, recalculate percentage
        slConfig.percentage = calcPercentageFromPrice(
          'stopLoss',
          config.stopLoss.price
        );
        hasChanges = true;
      } else if (
        slConfig.inputMode === 'percentage' &&
        config.stopLoss.percentage
      ) {
        // User input percentage, recalculate price
        slConfig.price = calcPriceFromPercentage(
          'stopLoss',
          config.stopLoss.percentage
        );
        hasChanges = true;
      }

      newConfig.stopLoss = handleTPSLConfigValidation('stopLoss', slConfig);
    }

    if (hasChanges) {
      setConfig(newConfig);
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
