import React from 'react';
import { TPSLConfig, TPSLConfigItem, TPSLSettingMode } from '../../../types';
import { formatTpOrSlPrice } from '@/ui/views/Perps/utils';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { DesktopPerpsInputV2 as DesktopPerpsInput } from '../../DesktopPerpsInputV2';
import { Dropdown, Menu, Tooltip } from 'antd';
import { ReactComponent as RcIconArrowDownPerpsCC } from '@/ui/assets/perps/icon-arrow-down.svg';
import BigNumber from 'bignumber.js';
import { PerpsDropdown } from './PerpsDropdown';
import Perps from '@/background/service/perps';

interface TPSLSettingsProps {
  config: TPSLConfig;
  setConfig: (config: TPSLConfig) => void;
  szDecimals: number;
  price: number | string;
  leverage: number;
  tradeSize: string;
}

const MODE_OPTIONS: {
  value: TPSLSettingMode;
  label: string;
  unit: string;
}[] = [
  { value: 'price', label: 'Price', unit: 'USDC' },
  { value: 'pnl', label: 'PNL', unit: 'USDC' },
  { value: 'roi', label: 'ROI%', unit: '%' },
];

// Compute trigger prices for PNL mode: triggerPrice = entryPrice ± (pnl / size)
const calcTriggerPricesFromPnl = (
  pnl: string,
  price: number,
  tradeSize: string,
  szDecimals: number
): { buyTriggerPrice: string; sellTriggerPrice: string } => {
  const pnlNum = Number(pnl);
  const size = Number(tradeSize);
  if (!pnlNum || !price || !size) {
    return { buyTriggerPrice: '', sellTriggerPrice: '' };
  }
  // Buy/Long: trigger = entry + pnl/size
  const buyTrigger = price + pnlNum / size;
  // Sell/Short: trigger = entry - pnl/size
  const sellTrigger = price - pnlNum / size;
  return {
    buyTriggerPrice:
      buyTrigger > 0 ? formatTpOrSlPrice(buyTrigger, szDecimals) : '',
    sellTriggerPrice:
      sellTrigger > 0 ? formatTpOrSlPrice(sellTrigger, szDecimals) : '',
  };
};

// Compute trigger prices for ROI mode: triggerPrice = entryPrice * (1 ± roi% / leverage)
const calcTriggerPricesFromRoi = (
  roiPercent: string,
  price: number,
  leverage: number,
  szDecimals: number
): { buyTriggerPrice: string; sellTriggerPrice: string } => {
  const roi = Number(roiPercent);
  if (!roi || !price || !leverage) {
    return { buyTriggerPrice: '', sellTriggerPrice: '' };
  }
  // Buy/Long: trigger = entry * (1 + roi% / (100 * leverage))
  const buyTrigger = price * (1 + roi / (100 * leverage));
  // Sell/Short: trigger = entry * (1 - roi% / (100 * leverage))
  const sellTrigger = price * (1 - roi / (100 * leverage));
  return {
    buyTriggerPrice:
      buyTrigger > 0 ? formatTpOrSlPrice(buyTrigger, szDecimals) : '',
    sellTriggerPrice:
      sellTrigger > 0 ? formatTpOrSlPrice(sellTrigger, szDecimals) : '',
  };
};

// Compute estimated PnL for Price mode
const calcEstimatedPnlFromPrice = (
  triggerPrice: string,
  entryPrice: number,
  tradeSize: string,
  leverage: number
): { estimatedPnl: string; estimatedPnlPercent: string } => {
  const trigger = Number(triggerPrice);
  const size = Number(tradeSize);
  if (!trigger || !entryPrice || !size) {
    return { estimatedPnl: '', estimatedPnlPercent: '' };
  }
  // Use absolute PnL based on price difference (direction-agnostic)
  // The sign depends on direction, which we don't know yet.
  // Show for Long direction:
  const pnl = (trigger - entryPrice) * size;
  const margin = (entryPrice * size) / leverage;
  const pnlPercent = margin > 0 ? (pnl / margin) * 100 : 0;
  return {
    estimatedPnl: pnl.toFixed(2),
    estimatedPnlPercent: pnlPercent.toFixed(2),
  };
};

const validateValueInput = (
  value: string,
  mode: TPSLSettingMode,
  szDecimals: number
): boolean => {
  if (value === '' || value === '-') return true;
  if (mode === 'price') {
    // Price: positive numbers with decimals up to szDecimals
    return /^\d*\.?\d*$/.test(value);
  }
  if (mode === 'pnl') {
    // PNL: allow negative, decimals up to 2
    return /^-?\d*\.?\d{0,2}$/.test(value);
  }
  if (mode === 'roi') {
    // ROI%: allow negative, decimals up to 2
    return /^-?\d*\.?\d{0,2}$/.test(value);
  }
  return true;
};

export const TPSLSettings: React.FC<TPSLSettingsProps> = ({
  config,
  setConfig,
  szDecimals,
  price,
  leverage,
  tradeSize,
}) => {
  const { t } = useTranslation();
  const priceNum = Number(price);
  const [focusedField, setFocusedField] = React.useState<
    'takeProfit' | 'stopLoss' | null
  >(null);

  const updateItem = useMemoizedFn(
    (type: 'takeProfit' | 'stopLoss', updates: Partial<TPSLConfigItem>) => {
      const item = { ...config[type], ...updates };

      // Recompute derived values based on mode
      if (item.value && priceNum) {
        if (item.settingMode === 'price') {
          const est = calcEstimatedPnlFromPrice(
            item.value,
            priceNum,
            tradeSize,
            leverage
          );
          item.estimatedPnl = est.estimatedPnl;
          item.estimatedPnlPercent = est.estimatedPnlPercent;
          item.buyTriggerPrice = item.value;
          item.sellTriggerPrice = item.value;
        } else if (item.settingMode === 'pnl') {
          const triggers = calcTriggerPricesFromPnl(
            item.value,
            priceNum,
            tradeSize,
            szDecimals
          );
          item.buyTriggerPrice = triggers.buyTriggerPrice;
          item.sellTriggerPrice = triggers.sellTriggerPrice;
          item.estimatedPnl = item.value;
          item.estimatedPnlPercent = '';
        } else if (item.settingMode === 'roi') {
          const triggers = calcTriggerPricesFromRoi(
            item.value,
            priceNum,
            leverage,
            szDecimals
          );
          item.buyTriggerPrice = triggers.buyTriggerPrice;
          item.sellTriggerPrice = triggers.sellTriggerPrice;
          item.estimatedPnl = '';
          item.estimatedPnlPercent = item.value;
        }
      } else {
        item.buyTriggerPrice = '';
        item.sellTriggerPrice = '';
        item.estimatedPnl = '';
        item.estimatedPnlPercent = '';
      }

      // Clear error on input (validation is deferred to button click)
      item.error = '';

      setConfig({ ...config, [type]: item });
    }
  );

  const handleValueChange = useMemoizedFn(
    (type: 'takeProfit' | 'stopLoss') => (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const value = e.target.value;
      const mode = config[type].settingMode;
      if (validateValueInput(value, mode, szDecimals)) {
        updateItem(type, { value });
      }
    }
  );

  const handleModeChange = useMemoizedFn(
    (type: 'takeProfit' | 'stopLoss', mode: TPSLSettingMode) => {
      updateItem(type, {
        settingMode: mode,
        value: '',
        error: '',
        buyTriggerPrice: '',
        sellTriggerPrice: '',
        estimatedPnl: '',
        estimatedPnlPercent: '',
      });
    }
  );

  const renderItem = (type: 'takeProfit' | 'stopLoss') => {
    const item = config[type];
    const isTP = type === 'takeProfit';
    const label = isTP ? 'Take Profit' : 'Stop Loss';
    const modeLabel =
      MODE_OPTIONS.find((o) => o.value === item.settingMode)?.label || 'Price';
    const unitLabel =
      MODE_OPTIONS.find((o) => o.value === item.settingMode)?.unit || 'USDC';

    const hasError = !!item.error;

    const showTriggerPrices =
      !hasError &&
      item.settingMode !== 'price' &&
      (item.buyTriggerPrice || item.sellTriggerPrice);

    const showEstimatedPnl =
      !hasError && item.settingMode === 'price' && item.estimatedPnl;

    return (
      <div className="space-y-[6px]">
        {/* Title */}
        <div className="text-[12px] text-r-neutral-foot">
          {label} ({modeLabel})
        </div>

        {/* Input with mode dropdown, trigger prices shown as tooltip */}
        <Tooltip
          visible={!!showTriggerPrices && focusedField === type}
          placement="topLeft"
          prefixCls="perps-slider-tip"
          title={
            <div className="text-13 px-4 py-2 flex flex-col gap-2">
              {item.buyTriggerPrice && (
                <div className="text-rb-neutral-title-2">
                  {t('page.perpsPro.tradingPanel.buyTrigger')}:{' '}
                  <span className="text-rb-green-default">
                    ${item.buyTriggerPrice} (
                    {t('page.perpsPro.tradingPanel.long')})
                  </span>
                </div>
              )}
              {item.sellTriggerPrice && (
                <div className="text-rb-neutral-title-2">
                  {t('page.perpsPro.tradingPanel.sellTrigger')}:{' '}
                  <span className="text-rb-red-default">
                    ${item.sellTriggerPrice} (
                    {t('page.perpsPro.tradingPanel.short')})
                  </span>
                </div>
              )}
            </div>
          }
        >
          <DesktopPerpsInput
            value={item.value}
            onChange={handleValueChange(type)}
            onFocus={() => setFocusedField(type)}
            onBlur={() => setFocusedField(null)}
            className={`text-left${hasError ? ' perps-input-error' : ''}`}
            suffix={
              <PerpsDropdown
                options={MODE_OPTIONS.map((o) => ({
                  key: o.value,
                  label: `${o.label}`,
                }))}
                onSelect={(mode) =>
                  handleModeChange(type, mode as TPSLSettingMode)
                }
              >
                <span className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot flex items-center gap-[6px] cursor-pointer whitespace-nowrap">
                  {unitLabel}
                  <RcIconArrowDownPerpsCC className="text-rb-neutral-secondary w-[12px] h-[12px]" />
                </span>
              </PerpsDropdown>
            }
          />
        </Tooltip>

        {/* Estimated PnL for Price mode - shown below input */}
        {showEstimatedPnl && (
          <div className="text-[12px] text-r-neutral-foot">
            {t('page.perpsPro.tradingPanel.estimatedPnlWillBe')}{' '}
            <span
              className={
                Number(item.estimatedPnl) >= 0
                  ? 'text-rb-green-default'
                  : 'text-rb-red-default'
              }
            >
              {Number(item.estimatedPnl) >= 0 ? '+' : ''}${item.estimatedPnl}
              {item.estimatedPnlPercent &&
                ` (${Number(item.estimatedPnlPercent) >= 0 ? '+' : ''}${
                  item.estimatedPnlPercent
                }%)`}
            </span>
          </div>
        )}

        {/* Error */}
        {item.error && (
          <div className="text-[12px] text-rb-red-default px-[4px]">
            {item.error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-[6px]">
      {renderItem('takeProfit')}
      {renderItem('stopLoss')}
    </div>
  );
};
