import React, { useEffect } from 'react';
import { TPSLConfig, TPSLConfigItem, TPSLSettingMode } from '../../../types';
import { formatTpOrSlPrice, validatePriceInput } from '@/ui/views/Perps/utils';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { DesktopPerpsInputV2 as DesktopPerpsInput } from '../../DesktopPerpsInputV2';
import { Dropdown, Menu, Tooltip } from 'antd';
import { ReactComponent as RcIconArrowDownPerpsCC } from '@/ui/assets/perps/icon-arrow-down.svg';
import BigNumber from 'bignumber.js';
import { PerpsDropdown } from './PerpsDropdown';
import Perps from '@/background/service/perps';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';

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
  const pnlBN = new BigNumber(pnl);
  const sizeBN = new BigNumber(tradeSize);
  const priceBN = new BigNumber(price);
  if (pnlBN.isZero() || priceBN.isZero() || sizeBN.isZero()) {
    return { buyTriggerPrice: '', sellTriggerPrice: '' };
  }
  // Buy/Long: trigger = entry + pnl/size
  const buyTrigger = priceBN.plus(pnlBN.div(sizeBN));
  // Sell/Short: trigger = entry - pnl/size
  const sellTrigger = priceBN.minus(pnlBN.div(sizeBN));
  return {
    buyTriggerPrice: buyTrigger.gt(0)
      ? formatTpOrSlPrice(buyTrigger.toNumber(), szDecimals)
      : '',
    sellTriggerPrice: sellTrigger.gt(0)
      ? formatTpOrSlPrice(sellTrigger.toNumber(), szDecimals)
      : '',
  };
};

// Compute trigger prices for ROI mode: triggerPrice = entryPrice * (1 ± roi% / leverage)
const calcTriggerPricesFromRoi = (
  roiPercent: string,
  price: number,
  leverage: number,
  szDecimals: number
): { buyTriggerPrice: string; sellTriggerPrice: string } => {
  const roiBN = new BigNumber(roiPercent);
  const priceBN = new BigNumber(price);
  if (roiBN.isZero() || priceBN.isZero() || !leverage) {
    return { buyTriggerPrice: '', sellTriggerPrice: '' };
  }
  const leverageBN = new BigNumber(leverage);
  const factor = roiBN.div(leverageBN.multipliedBy(100));
  // Buy/Long: trigger = entry * (1 + roi% / (100 * leverage))
  const buyTrigger = priceBN.multipliedBy(new BigNumber(1).plus(factor));
  // Sell/Short: trigger = entry * (1 - roi% / (100 * leverage))
  const sellTrigger = priceBN.multipliedBy(new BigNumber(1).minus(factor));
  return {
    buyTriggerPrice: buyTrigger.gt(0)
      ? formatTpOrSlPrice(buyTrigger.toNumber(), szDecimals)
      : '',
    sellTriggerPrice: sellTrigger.gt(0)
      ? formatTpOrSlPrice(sellTrigger.toNumber(), szDecimals)
      : '',
  };
};

// Compute estimated PnL for Price mode
// Direction-agnostic: auto-infer direction from price relationship
// TP: triggerPrice > entryPrice → Long, triggerPrice < entryPrice → Short → PnL always positive
// SL: triggerPrice < entryPrice → Long, triggerPrice > entryPrice → Short → PnL always negative
const calcEstimatedPnlFromPrice = (
  triggerPrice: string,
  entryPrice: number,
  tradeSize: string,
  leverage: number,
  type: 'takeProfit' | 'stopLoss'
): {
  estimatedPnl: string;
  estimatedPnlPercent: string;
} => {
  const trigger = Number(triggerPrice);
  const size = Number(tradeSize);
  if (!trigger || !entryPrice || !size) {
    return { estimatedPnl: '', estimatedPnlPercent: '' };
  }
  const priceDiff = new BigNumber(trigger).minus(entryPrice).abs();
  const pnlAbs = priceDiff.multipliedBy(size);
  // TP → positive PnL, SL → negative PnL
  const pnl = type === 'takeProfit' ? pnlAbs : pnlAbs.negated();
  const margin = new BigNumber(entryPrice).multipliedBy(size).div(leverage);
  const pnlPercent = margin.gt(0)
    ? pnl.div(margin).multipliedBy(100)
    : new BigNumber(0);
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
  if (value === '') return true;
  if (mode === 'price') {
    return validatePriceInput(value, szDecimals);
  }
  if (mode === 'pnl' || mode === 'roi') {
    // Only positive numbers allowed (SL negative sign is auto-managed)
    return /^\d*\.?\d{0,2}$/.test(value);
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
            leverage,
            type
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

  // Recalculate derived values (trigger prices / estimated PnL) when price or tradeSize changes
  React.useEffect(() => {
    if (!config.enabled) return;
    const newConfig = { ...config };
    let changed = false;
    (['takeProfit', 'stopLoss'] as const).forEach((type) => {
      const item = { ...newConfig[type] };
      if (!item.value || !priceNum) return;
      if (item.settingMode === 'price') {
        const est = calcEstimatedPnlFromPrice(
          item.value,
          priceNum,
          tradeSize,
          leverage,
          type
        );
        item.estimatedPnl = est.estimatedPnl;
        item.estimatedPnlPercent = est.estimatedPnlPercent;
      } else if (item.settingMode === 'pnl') {
        const triggers = calcTriggerPricesFromPnl(
          item.value,
          priceNum,
          tradeSize,
          szDecimals
        );
        item.buyTriggerPrice = triggers.buyTriggerPrice;
        item.sellTriggerPrice = triggers.sellTriggerPrice;
      } else if (item.settingMode === 'roi') {
        const triggers = calcTriggerPricesFromRoi(
          item.value,
          priceNum,
          leverage,
          szDecimals
        );
        item.buyTriggerPrice = triggers.buyTriggerPrice;
        item.sellTriggerPrice = triggers.sellTriggerPrice;
      }
      newConfig[type] = item;
      changed = true;
    });
    if (changed) {
      setConfig(newConfig);
    }
  }, [price, tradeSize]);

  const handleValueChange = useMemoizedFn(
    (type: 'takeProfit' | 'stopLoss') => (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      let value = e.target.value;
      const mode = config[type].settingMode;
      const isSL = type === 'stopLoss';
      const isPnlOrRoi = mode === 'pnl' || mode === 'roi';

      if (isSL && isPnlOrRoi) {
        // Strip any "-" the user might have typed, we manage it
        value = value.replace(/-/g, '');
        // If empty after stripping, clear the field
        if (!value) {
          updateItem(type, { value: '' });
          return;
        }
        // Validate the positive part, then prepend "-"
        if (!validateValueInput(value, mode, szDecimals)) return;
        updateItem(type, { value: `-${value}` });
        return;
      }

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
      !hasError &&
      item.settingMode === 'price' &&
      Boolean(Number(item.estimatedPnl));

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
            <div className="text-13 px-4 py-2 flex flex-col justify-start text-left gap-2">
              {item.buyTriggerPrice && (
                <div className="text-rb-neutral-title-2">
                  {t('page.perpsPro.tradingPanel.buyTrigger')}:{' '}
                  <span className="text-rb-green-default">
                    ${splitNumberByStep(item.buyTriggerPrice)} (
                    {t('page.perpsPro.tradingPanel.long')})
                  </span>
                </div>
              )}
              {item.sellTriggerPrice && (
                <div className="text-rb-neutral-title-2">
                  {t('page.perpsPro.tradingPanel.sellTrigger')}:{' '}
                  <span className="text-rb-red-default">
                    ${splitNumberByStep(item.sellTriggerPrice)} (
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
            placeholder={modeLabel}
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
                <span className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1 flex items-center gap-[6px] cursor-pointer whitespace-nowrap">
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
              {Number(item.estimatedPnl) >= 0 ? '+' : '-'}
              {formatUsdValue(Math.abs(Number(item.estimatedPnl)))}
              {item.estimatedPnlPercent &&
                ` (${Number(item.estimatedPnl) >= 0 ? '+' : '-'}${Math.abs(
                  Number(item.estimatedPnlPercent)
                )}%)`}
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
