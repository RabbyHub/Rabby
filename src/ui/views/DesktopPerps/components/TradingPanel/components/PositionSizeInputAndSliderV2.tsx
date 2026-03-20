import React, { useEffect, useMemo, useState } from 'react';
import { Tooltip } from 'antd';
import { PositionSize, SizeDisplayUnit } from '../../../types';
import { DesktopPerpsSliderV2 } from '../../DesktopPerpsSliderV2';
import { useMemoizedFn } from 'ahooks';
import BigNumber from 'bignumber.js';
import {
  calcAssetAmountByNotional,
  calcAssetNotionalByAmount,
  validateAmountInput,
  validateNotionalInput,
} from '../utils';
import { DesktopPerpsInputV2 } from '../../DesktopPerpsInputV2';
import { formatPerpsCoin } from '../../../utils';
import { useTranslation } from 'react-i18next';
import { PerpsDropdown } from './PerpsDropdown';
import { ReactComponent as RcIconSwitchCC } from '@/ui/assets/swap/switch-cc.svg';
import { useRabbySelector } from '@/ui/store';

const PRESET_POINTS = [0, 25, 50, 75, 100];

const SLIDER_MARKS = PRESET_POINTS.reduce((acc, point) => {
  acc[point] = '';
  return acc;
}, {} as Record<number, string>);

interface PositionSizeInputAndSliderV2Props {
  price: number | string;
  maxBuyTradeSize: string | undefined;
  maxSellTradeSize: string | undefined;
  positionSize: PositionSize;
  setPositionSize: (positionSize: PositionSize) => void;
  percentage: number;
  setPercentage: (percentage: number) => void;
  baseAsset: string;
  szDecimals: number;
  sizeDisplayUnit: SizeDisplayUnit;
  onUnitChange: (unit: SizeDisplayUnit) => void;
  reduceOnly?: boolean;
}

export const PositionSizeInputAndSliderV2: React.FC<PositionSizeInputAndSliderV2Props> = ({
  price,
  maxBuyTradeSize,
  maxSellTradeSize,
  positionSize,
  setPositionSize,
  percentage,
  setPercentage,
  baseAsset,
  szDecimals,
  sizeDisplayUnit,
  onUnitChange,
  reduceOnly,
}) => {
  const { t } = useTranslation();
  const currentPerpsAccount = useRabbySelector(
    (state) => state.perps.currentPerpsAccount
  );

  // Raw input text — numeric only, "50%" is a slider placeholder
  const [inputText, setInputText] = React.useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSliderMode, setIsSliderMode] = useState(false);

  // Use the larger of buy/sell max as reference for positionSize.amount (for basic validation like min order size)
  // Each direction's actual amount is calculated separately in preview and at order time
  const referenceMaxTradeSize = useMemo(() => {
    const buy = Number(maxBuyTradeSize || 0);
    const sell = Number(maxSellTradeSize || 0);
    if (buy >= sell) return maxBuyTradeSize || '0';
    return maxSellTradeSize || '0';
  }, [maxBuyTradeSize, maxSellTradeSize]);

  // --- Calculate positionSize from percentage ---
  const calcPositionFromPercentage = useMemoizedFn((pct: number) => {
    if (!price || pct === 0) {
      setPositionSize({
        amount: '',
        notionalValue: '',
        inputSource: 'slider',
      });
      return;
    }

    if (pct === 100 && referenceMaxTradeSize) {
      const notional = calcAssetNotionalByAmount(referenceMaxTradeSize, price);
      setPositionSize({
        amount: referenceMaxTradeSize,
        notionalValue: notional,
        inputSource: 'slider',
      });
      return;
    }

    const orderSize = new BigNumber(referenceMaxTradeSize || 0)
      .multipliedBy(pct)
      .div(100);
    const notionalValue = orderSize
      .multipliedBy(new BigNumber(price))
      .toNumber();

    if (notionalValue === 0) {
      setPositionSize({
        amount: '',
        notionalValue: '',
        inputSource: 'slider',
      });
      return;
    }

    let amount = calcAssetAmountByNotional(notionalValue, price, szDecimals);
    let newNotionalValue = calcAssetNotionalByAmount(amount, price);
    if (
      referenceMaxTradeSize &&
      Number(amount) > Number(referenceMaxTradeSize)
    ) {
      amount = referenceMaxTradeSize;
      newNotionalValue = calcAssetNotionalByAmount(
        referenceMaxTradeSize,
        price
      );
    }
    setPositionSize({
      amount,
      notionalValue: newNotionalValue,
      inputSource: 'slider',
    });
  });

  // --- Slider drag → enter slider mode with percentage placeholder ---
  const handleSliderChange = useMemoizedFn((newPercentage: number) => {
    setPercentage(newPercentage);
    setIsSliderMode(true);
    setInputText(newPercentage > 0 ? `${newPercentage}%` : '');
    calcPositionFromPercentage(newPercentage);
  });

  // --- Numeric: amount input (slider does NOT sync) ---
  const handleAmountInput = useMemoizedFn((amount: string) => {
    if (!price) {
      setPositionSize({
        amount,
        notionalValue: '',
        inputSource: 'amount',
      });
      return;
    }
    const notionalValue = new BigNumber(amount).multipliedBy(price);
    const notionalStr = notionalValue.gt(0)
      ? notionalValue.toFixed(2, BigNumber.ROUND_DOWN)
      : '';
    setPositionSize({
      amount,
      notionalValue: notionalStr,
      inputSource: 'amount',
    });
  });

  // --- Numeric: notional input (slider does NOT sync) ---
  const handleNotionalInput = useMemoizedFn((notional: string) => {
    if (!price) {
      setPositionSize({
        amount: '',
        notionalValue: notional,
        inputSource: 'notional',
      });
      return;
    }
    const amount = notional
      ? calcAssetAmountByNotional(notional, price, szDecimals)
      : '';
    setPositionSize({
      amount,
      notionalValue: notional,
      inputSource: 'notional',
    });
  });

  // --- Input onChange: numeric only, no special chars allowed ---
  const handleInputChange = useMemoizedFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Allow empty input
      if (raw === '') {
        if (isSliderMode) {
          setIsSliderMode(false);
          setPercentage(0);
        }
        setInputText('');
        setPositionSize({
          amount: '',
          notionalValue: '',
          inputSource: sizeDisplayUnit === 'base' ? 'amount' : 'notional',
        });
        return;
      }

      // Validate: only accept numeric input
      const isValid =
        sizeDisplayUnit === 'base'
          ? validateAmountInput(raw, szDecimals)
          : validateNotionalInput(raw);
      if (!isValid) return; // Reject non-numeric input (including "%")

      // Exit slider mode on valid manual input
      if (isSliderMode) {
        setIsSliderMode(false);
        setPercentage(0);
      }

      setInputText(raw);
      if (sizeDisplayUnit === 'base') {
        handleAmountInput(raw);
      } else {
        handleNotionalInput(raw);
      }
    }
  );

  // Sync inputText when positionSize changes externally (e.g., reset)
  useEffect(() => {
    if (isSliderMode) return; // slider mode manages inputText itself
    const val =
      sizeDisplayUnit === 'base'
        ? positionSize.amount
        : positionSize.notionalValue;
    if (val !== inputText) {
      setInputText(val || '');
    }
  }, [positionSize.amount, positionSize.notionalValue, sizeDisplayUnit]);

  // Recalculate when price changes
  useEffect(() => {
    if (positionSize.inputSource === 'slider' && positionSize.amount && price) {
      calcPositionFromPercentage(percentage);
    } else if (
      positionSize.inputSource === 'notional' &&
      positionSize.notionalValue
    ) {
      handleNotionalInput(positionSize.notionalValue);
    } else if (positionSize.inputSource === 'amount' && positionSize.amount) {
      handleAmountInput(positionSize.amount);
    }
  }, [price, referenceMaxTradeSize]);

  // Calculate direction-specific amount from percentage
  const calcDirectionAmount = useMemoizedFn(
    (dirMax: string | undefined, pct: number): string => {
      if (!dirMax || !price || pct === 0) return '0';
      if (pct === 100) return dirMax;
      const amount = new BigNumber(dirMax)
        .multipliedBy(pct)
        .div(100)
        .toFixed(szDecimals, BigNumber.ROUND_DOWN);
      return Number(amount) > 0 ? amount : '0';
    }
  );

  // Preview: show separate buy/sell amounts
  const { buyPreview, sellPreview } = useMemo(() => {
    const unit =
      sizeDisplayUnit === 'usdc' ? 'USDC' : formatPerpsCoin(baseAsset);

    if (isSliderMode || positionSize.inputSource === 'slider') {
      // Percentage mode: each direction has its own amount
      const buyAmt = calcDirectionAmount(maxBuyTradeSize, percentage);
      const sellAmt = calcDirectionAmount(maxSellTradeSize, percentage);

      if (sizeDisplayUnit === 'usdc') {
        const buyNotional =
          Number(buyAmt) > 0 ? calcAssetNotionalByAmount(buyAmt, price) : '0';
        const sellNotional =
          Number(sellAmt) > 0 ? calcAssetNotionalByAmount(sellAmt, price) : '0';
        return {
          buyPreview: `${buyNotional} ${unit}`,
          sellPreview: `${sellNotional} ${unit}`,
        };
      }
      return {
        buyPreview: `${buyAmt} ${unit}`,
        sellPreview: `${sellAmt} ${unit}`,
      };
    }

    // Numeric mode: both directions show the same value
    if (sizeDisplayUnit === 'usdc') {
      // USDC mode: convert input USDC → size (rounded) → size * price = actual USDC
      const actualNotional =
        positionSize.amount && Number(price)
          ? calcAssetNotionalByAmount(positionSize.amount, price)
          : '0';
      const display = `${actualNotional} ${unit}`;
      return { buyPreview: display, sellPreview: display };
    }
    const display = `${positionSize.amount || '0'} ${unit}`;
    return { buyPreview: display, sellPreview: display };
  }, [
    isSliderMode,
    positionSize.inputSource,
    positionSize.amount,
    positionSize.notionalValue,
    percentage,
    maxBuyTradeSize,
    maxSellTradeSize,
    sizeDisplayUnit,
    baseAsset,
    price,
    szDecimals,
  ]);

  const unitLabel = useMemo(
    () => (sizeDisplayUnit === 'base' ? formatPerpsCoin(baseAsset) : 'USDC'),
    [sizeDisplayUnit, baseAsset]
  );

  // Tooltip: show equivalent amount in the other unit when focused
  const tooltipContent = useMemo(() => {
    if (!positionSize.amount || !price) return null;
    if (sizeDisplayUnit === 'base') {
      return null;
      // Input is in base → tooltip shows USDC equivalent
      const notional = positionSize.notionalValue || '0';
      return `≈ ${notional} USDC`;
    }
    // Input is in USDC → tooltip shows base equivalent
    const coin = formatPerpsCoin(baseAsset);
    return `≈ ${positionSize.amount} ${coin}`;
  }, [
    positionSize.amount,
    positionSize.notionalValue,
    sizeDisplayUnit,
    baseAsset,
    price,
  ]);

  const showTooltip = isFocused && !!tooltipContent;

  // Focus: exit slider mode, clear to empty for fresh input
  const handleFocus = useMemoizedFn(() => {
    setIsFocused(true);
    if (isSliderMode) {
      setIsSliderMode(false);
      setPercentage(0);
      setInputText('');
      setPositionSize({
        amount: '',
        notionalValue: '',
        inputSource: sizeDisplayUnit === 'base' ? 'amount' : 'notional',
      });
    }
  });

  // Reset slider mode when coin changes
  useEffect(() => {
    if (currentPerpsAccount?.address && baseAsset) {
      setIsSliderMode(false);
      setInputText('');
    }
  }, [baseAsset, currentPerpsAccount?.address]);

  const handleChangeUnit = useMemoizedFn(() => {
    const newUnit = sizeDisplayUnit === 'base' ? 'usdc' : 'base';
    onUnitChange(newUnit);
  });

  return (
    <div className="w-full gap-[8px] flex flex-col">
      {/* Size label */}
      <div className="flex items-center justify-between">
        <span className="text-rb-neutral-secondary text-[12px]">
          {t('page.perpsPro.tradingPanel.size')}
        </span>
      </div>

      <Tooltip
        visible={showTooltip}
        placement="topLeft"
        overlayClassName="rectangle"
        title={tooltipContent}
      >
        {/* Input: accepts "1.5" (numeric) or "50%" (percent) */}
        <DesktopPerpsInputV2
          className={isSliderMode && percentage > 0 ? 'slider-active' : ''}
          value={inputText}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={() => setIsFocused(false)}
          suffix={
            <div
              className="text-15 font-medium text-rb-neutral-title-1 px-[10px] h-[28px] flex items-center gap-[2px] cursor-pointer whitespace-nowrap bg-rb-neutral-bg-0 rounded-[6px]"
              onClick={handleChangeUnit}
            >
              {unitLabel}
              <RcIconSwitchCC className="text-r-neutral-foot w-[12px] h-[12px]" />
            </div>
          }
        />
      </Tooltip>

      {/* Slider — always shows percentage, syncs when input is "XX%" */}
      <div className="px-[4px] mt-[12px] mb-[8px]">
        <DesktopPerpsSliderV2
          min={0}
          max={100}
          value={percentage}
          onChange={handleSliderChange}
          step={1}
          marks={SLIDER_MARKS}
          showTooltip
          tipFormatter={(v) => `${v}%`}
        />
      </div>

      <div className="flex items-center justify-between text-[12px]">
        <div className="flex items-center gap-[4px]">
          <span className="text-rb-neutral-secondary">
            {t('page.perpsPro.tradingPanel.Buy')}
          </span>
          <span className="text-rb-neutral-title-1">{buyPreview}</span>
        </div>
        <div className="flex items-center gap-[4px]">
          <span className="text-rb-neutral-secondary">
            {t('page.perpsPro.tradingPanel.Sell')}
          </span>
          <span className="text-rb-neutral-title-1">{sellPreview}</span>
        </div>
      </div>
    </div>
  );
};
