import React from 'react';
import { TPSLConfig, TPSLConfigItem, TPSLSettingMode } from '../../../types';
import { formatTpOrSlPrice, validatePriceInput } from '@/ui/views/Perps/utils';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { DesktopPerpsInputV2 as DesktopPerpsInput } from '../../DesktopPerpsInputV2';
import { ReactComponent as RcIconArrowDownPerpsCC } from '@/ui/assets/perps/icon-arrow-down.svg';
import BigNumber from 'bignumber.js';
import { PerpsDropdown } from './PerpsDropdown';
import { formatUsdValue } from '@/ui/utils';
import clsx from 'clsx';

interface TPSLSettingsProps {
  config: TPSLConfig;
  setConfig: (config: TPSLConfig) => void;
  szDecimals: number;
  price: number | string;
  leverage: number;
  tradeSize: string;
}

type TPSLType = 'takeProfit' | 'stopLoss';
type UpdateSource = 'trigger' | 'modeValue' | 'mode' | 'recalc';

const MODE_OPTIONS: {
  value: Extract<TPSLSettingMode, 'pnl' | 'roi'>;
  label: string;
}[] = [
  { value: 'pnl', label: 'PNL' },
  { value: 'roi', label: 'ROI%' },
];

const stripNumberDecorations = (value: string) => {
  return value.replace(/,/g, '').replace(/[$%\s]/g, '');
};

const sanitizeTriggerPriceInput = (value: string, szDecimals: number) => {
  const next = stripNumberDecorations(value).replace(/[+-]/g, '');
  if (validatePriceInput(next, szDecimals)) {
    return next;
  }
  return null;
};

const sanitizeModeValueInput = (value: string) => {
  const next = stripNumberDecorations(value).replace(/[+-]/g, '');
  if (/^\d*\.?\d{0,2}$/.test(next)) {
    return next;
  }
  return null;
};

const getSignedModeValue = (type: TPSLType, value: string) => {
  if (!value || value === '.') return '';
  return type === 'stopLoss' ? `-${value}` : value;
};

const getMargin = (entryPrice: number, tradeSize: string, leverage: number) => {
  const sizeBN = new BigNumber(tradeSize || 0);
  const entryBN = new BigNumber(entryPrice || 0);
  if (!sizeBN.gt(0) || !entryBN.gt(0) || !leverage) {
    return new BigNumber(0);
  }
  return entryBN.times(sizeBN).div(leverage);
};

const getRecalcSource = (item: TPSLConfigItem): UpdateSource => {
  return item.lastEditSource || (item.value ? 'modeValue' : 'trigger');
};

const calcTriggerPricesFromPnl = ({
  pnl,
  price,
  tradeSize,
  szDecimals,
}: {
  pnl: string;
  price: number;
  tradeSize: string;
  szDecimals: number;
}): { buyTriggerPrice: string; sellTriggerPrice: string } => {
  const pnlBN = new BigNumber(pnl || 0);
  const sizeBN = new BigNumber(tradeSize || 0);
  const priceBN = new BigNumber(price || 0);
  if (pnlBN.isZero() || priceBN.isZero() || sizeBN.isZero()) {
    return { buyTriggerPrice: '', sellTriggerPrice: '' };
  }

  const buyTrigger = priceBN.plus(pnlBN.div(sizeBN));
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

const calcTriggerPricesFromRoi = ({
  roiPercent,
  price,
  leverage,
  szDecimals,
}: {
  roiPercent: string;
  price: number;
  leverage: number;
  szDecimals: number;
}): { buyTriggerPrice: string; sellTriggerPrice: string } => {
  const roiBN = new BigNumber(roiPercent || 0);
  const priceBN = new BigNumber(price || 0);
  if (roiBN.isZero() || priceBN.isZero() || !leverage) {
    return { buyTriggerPrice: '', sellTriggerPrice: '' };
  }

  const factor = roiBN.div(new BigNumber(leverage).times(100));
  const buyTrigger = priceBN.times(new BigNumber(1).plus(factor));
  const sellTrigger = priceBN.times(new BigNumber(1).minus(factor));
  return {
    buyTriggerPrice: buyTrigger.gt(0)
      ? formatTpOrSlPrice(buyTrigger.toNumber(), szDecimals)
      : '',
    sellTriggerPrice: sellTrigger.gt(0)
      ? formatTpOrSlPrice(sellTrigger.toNumber(), szDecimals)
      : '',
  };
};

const calcEstimatedPnlFromTrigger = ({
  triggerPrice,
  entryPrice,
  tradeSize,
  leverage,
  type,
}: {
  triggerPrice: string;
  entryPrice: number;
  tradeSize: string;
  leverage: number;
  type: TPSLType;
}): {
  estimatedPnl: string;
  estimatedPnlPercent: string;
} => {
  const trigger = Number(triggerPrice);
  const size = Number(tradeSize);
  if (!trigger || !entryPrice || !size) {
    return { estimatedPnl: '', estimatedPnlPercent: '' };
  }

  const pnlAbs = new BigNumber(trigger).minus(entryPrice).abs().times(size);
  const pnl = type === 'takeProfit' ? pnlAbs : pnlAbs.negated();
  const margin = getMargin(entryPrice, tradeSize, leverage);
  const pnlPercent = margin.gt(0)
    ? pnl.div(margin).times(100)
    : new BigNumber(0);

  return {
    estimatedPnl: pnl.toFixed(2),
    estimatedPnlPercent: pnlPercent.toFixed(2),
  };
};

const applyDerivedValues = ({
  item,
  type,
  source,
  priceNum,
  tradeSize,
  leverage,
  szDecimals,
}: {
  item: TPSLConfigItem;
  type: TPSLType;
  source: UpdateSource;
  priceNum: number;
  tradeSize: string;
  leverage: number;
  szDecimals: number;
}): TPSLConfigItem => {
  const next: TPSLConfigItem = {
    ...item,
    triggerPrice: item.triggerPrice || '',
  };

  if (source === 'trigger' || (source === 'mode' && next.triggerPrice)) {
    if (!next.triggerPrice || !priceNum) {
      return {
        ...next,
        value: '',
        buyTriggerPrice: '',
        sellTriggerPrice: '',
        estimatedPnl: '',
        estimatedPnlPercent: '',
      };
    }

    const est = calcEstimatedPnlFromTrigger({
      triggerPrice: next.triggerPrice,
      entryPrice: priceNum,
      tradeSize,
      leverage,
      type,
    });

    next.buyTriggerPrice = next.triggerPrice;
    next.sellTriggerPrice = next.triggerPrice;
    next.estimatedPnl = est.estimatedPnl;
    next.estimatedPnlPercent = est.estimatedPnlPercent;
    next.value =
      next.settingMode === 'roi' ? est.estimatedPnlPercent : est.estimatedPnl;
    return next;
  }

  if (!next.value || !priceNum) {
    return {
      ...next,
      triggerPrice: '',
      buyTriggerPrice: '',
      sellTriggerPrice: '',
      estimatedPnl: '',
      estimatedPnlPercent: '',
    };
  }

  if (next.settingMode === 'pnl') {
    const triggers = calcTriggerPricesFromPnl({
      pnl: next.value,
      price: priceNum,
      tradeSize,
      szDecimals,
    });
    const margin = getMargin(priceNum, tradeSize, leverage);
    const estimatedPnlPercent = margin.gt(0)
      ? new BigNumber(next.value).div(margin).times(100).toFixed(2)
      : '';
    return {
      ...next,
      triggerPrice: triggers.buyTriggerPrice || triggers.sellTriggerPrice,
      buyTriggerPrice: triggers.buyTriggerPrice,
      sellTriggerPrice: triggers.sellTriggerPrice,
      estimatedPnl: next.value,
      estimatedPnlPercent,
    };
  }

  const triggers = calcTriggerPricesFromRoi({
    roiPercent: next.value,
    price: priceNum,
    leverage,
    szDecimals,
  });
  const margin = getMargin(priceNum, tradeSize, leverage);
  const estimatedPnl = margin.gt(0)
    ? margin.times(new BigNumber(next.value).div(100)).toFixed(2)
    : '';
  return {
    ...next,
    triggerPrice: triggers.buyTriggerPrice || triggers.sellTriggerPrice,
    buyTriggerPrice: triggers.buyTriggerPrice,
    sellTriggerPrice: triggers.sellTriggerPrice,
    estimatedPnl,
    estimatedPnlPercent: next.value,
  };
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

  const updateItem = useMemoizedFn(
    (
      type: TPSLType,
      updates: Partial<TPSLConfigItem>,
      source: UpdateSource
    ) => {
      const item = applyDerivedValues({
        item: {
          ...config[type],
          ...updates,
          lastEditSource:
            source === 'trigger' || source === 'modeValue'
              ? source
              : config[type].lastEditSource,
          settingMode:
            updates.settingMode === 'price'
              ? 'pnl'
              : updates.settingMode || config[type].settingMode || 'pnl',
        },
        type,
        source,
        priceNum,
        tradeSize,
        leverage,
        szDecimals,
      });

      setConfig({
        ...config,
        [type]: {
          ...item,
          error: '',
        },
      });
    }
  );

  React.useEffect(() => {
    if (!config.enabled) return;
    const newConfig = { ...config };
    let changed = false;

    (['takeProfit', 'stopLoss'] as const).forEach((type) => {
      const current = config[type];
      if (!current.value && !current.triggerPrice) return;
      newConfig[type] = applyDerivedValues({
        item: current,
        type,
        source: getRecalcSource(current),
        priceNum,
        tradeSize,
        leverage,
        szDecimals,
      });
      changed = true;
    });

    if (changed) {
      setConfig(newConfig);
    }
  }, [price, tradeSize, leverage, szDecimals]);

  const handleTriggerChange = useMemoizedFn(
    (type: TPSLType) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = sanitizeTriggerPriceInput(e.target.value, szDecimals);
      if (value === null) return;
      updateItem(type, { triggerPrice: value }, 'trigger');
    }
  );

  const handleValueChange = useMemoizedFn(
    (type: TPSLType) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const clean = sanitizeModeValueInput(e.target.value);
      if (clean === null) return;
      updateItem(type, { value: getSignedModeValue(type, clean) }, 'modeValue');
    }
  );

  const handleModeChange = useMemoizedFn(
    (type: TPSLType, mode: TPSLSettingMode) => {
      if (mode === 'price') return;
      updateItem(
        type,
        {
          settingMode: mode,
          value: '',
          estimatedPnl: '',
          estimatedPnlPercent: '',
        },
        'mode'
      );
    }
  );

  const renderEstimatedPnl = (item: TPSLConfigItem) => {
    if (!item.estimatedPnl) return null;
    const pnl = Number(item.estimatedPnl);
    const percent = Number(item.estimatedPnlPercent || 0);
    const pnlClassName =
      pnl >= 0 ? 'text-rb-green-default' : 'text-rb-red-default';

    return (
      <div className="text-[12px] text-r-neutral-foot">
        {t('page.perpsPro.tradingPanel.estimatedPnlWillBe')}{' '}
        <span className={pnlClassName}>
          {pnl >= 0 ? '+' : '-'}
          {formatUsdValue(Math.abs(pnl))}
          {item.estimatedPnlPercent
            ? `(${percent >= 0 ? '+' : '-'}${Math.abs(percent).toFixed(2)}%)`
            : ''}
        </span>
      </div>
    );
  };

  const renderItem = (type: TPSLType) => {
    const item = {
      ...config[type],
      triggerPrice: config[type].triggerPrice || '',
      settingMode:
        config[type].settingMode === 'price'
          ? 'pnl'
          : config[type].settingMode || 'pnl',
    };
    const isTP = type === 'takeProfit';
    const label = isTP ? 'Take Profit' : 'Stop Loss';
    const modeLabel =
      MODE_OPTIONS.find((option) => option.value === item.settingMode)?.label ||
      'PNL';
    const hasError = !!item.error;
    const displayValue =
      type === 'stopLoss' ? item.value.replace(/^-/, '') : item.value;

    return (
      <div className="space-y-[6px]">
        <div className="text-[12px] text-r-neutral-foot">{label}</div>

        <div className="flex items-start gap-[8px]">
          <DesktopPerpsInput
            value={item.triggerPrice}
            onChange={handleTriggerChange(type)}
            inputMode="decimal"
            placeholder="Trigger Price"
            className={clsx(
              'text-left flex-1',
              hasError && 'perps-input-error'
            )}
          />

          <DesktopPerpsInput
            value={displayValue}
            onChange={handleValueChange(type)}
            inputMode="decimal"
            placeholder={modeLabel}
            className={clsx(
              'text-left w-[128px]',
              hasError && 'perps-input-error'
            )}
            suffix={
              <PerpsDropdown
                options={MODE_OPTIONS.map((option) => ({
                  key: option.value,
                  label: option.label,
                }))}
                onSelect={(mode) =>
                  handleModeChange(type, mode as TPSLSettingMode)
                }
              >
                <span className="text-15 font-medium text-rb-neutral-title-1 flex items-center gap-[6px] cursor-pointer whitespace-nowrap">
                  {modeLabel}
                  <RcIconArrowDownPerpsCC className="text-rb-neutral-secondary w-[12px] h-[12px]" />
                </span>
              </PerpsDropdown>
            }
          />
        </div>

        {renderEstimatedPnl(item)}

        {item.error ? (
          <div className="text-[12px] text-rb-red-default px-[4px]">
            {item.error}
          </div>
        ) : null}
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
