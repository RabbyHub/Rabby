import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { Button } from 'antd';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import Popup from '@/ui/component/Popup';
import { PerpsSlider } from '@/ui/views/Perps/components/PerpsSlider';
import { useSpotActions } from '../hooks/useSpotActions';
import {
  formatSpotLimitPrice,
  formatSpotPrice,
  formatSpotQuoteAmount,
  formatSpotSize,
  getSpotAmountConversionPrice,
  getSpotMarketOrderPrice,
  getSpotMaxQuoteAmount,
  getSpotMaxSize,
  getSpotSizeFromAmount,
  getSpotTokenBalance,
  SPOT_MARKET_SLIPPAGE,
  SPOT_MIN_ORDER_NOTIONAL,
  SPOT_PRICE_MAX_AGE_MS,
  validateSpotOrder,
} from '../utils/spotMarkets';
import type {
  SpotAmountUnit,
  SpotBalance,
  SpotMarket,
  SpotOrderSide,
  SpotOrderType,
} from '../utils/spotMarkets';

const DECIMAL_INPUT_RE = /^\d*\.?\d*$/;
const QUICK_PCTS = [25, 50, 75, 100] as const;
const POPUP_BASE_HEIGHT = 560;
const POPUP_LIMIT_EXTRA_HEIGHT = 84;
// Keep the title visible in the 600px popup window; the form scrolls instead.
const POPUP_TOP_GAP = 20;

const sanitizeDecimalInput = (text: string) => {
  const normalized = text.replace(',', '.');
  return DECIMAL_INPUT_RE.test(normalized) ? normalized : null;
};

const roundAmount = (
  value: BigNumber.Value,
  unit: SpotAmountUnit,
  szDecimals: number
) =>
  unit === 'base'
    ? formatSpotSize(value, szDecimals)
    : formatSpotQuoteAmount(value);

/**
 * Popup placing one spot order on `market`: slippage-bounded market orders,
 * limit prices rounded toward the passive side, stale-price refusal and a
 * synchronous double-submit lock.
 */
export const SpotOrderPopup: React.FC<{
  visible: boolean;
  side: SpotOrderSide;
  market: SpotMarket;
  balances: ReadonlyArray<SpotBalance> | null;
  midsUpdatedAt: number;
  hasAccount: boolean;
  /** False when the region gate or login forbids trading. */
  canTrade: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  refreshPrices: () => void;
}> = ({
  visible,
  side,
  market,
  balances,
  midsUpdatedAt,
  hasAccount,
  canTrade,
  onClose,
  onSubmitted,
  refreshPrices,
}) => {
  const { t } = useTranslation();
  const { executeSpotOrder } = useSpotActions();

  const [orderType, setOrderType] = useState<SpotOrderType>('market');
  const [unit, setUnit] = useState<SpotAmountUnit>('quote');
  const [amount, setAmount] = useState('');
  const [limitPx, setLimitPx] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Mid timestamp a market order was refused at; cleared by the next poll.
  const [stalePriceAt, setStalePriceAt] = useState<number | null>(null);
  const submitLockRef = useRef(false);

  const { szDecimals, midPx } = market;
  const isBuy = side === 'buy';
  const baseAvailable = getSpotTokenBalance(balances, market.baseTokenIndex)
    .available;
  const quoteAvailable = getSpotTokenBalance(balances, market.quoteTokenIndex)
    .available;
  // Latest inputs for the order built after the agent approval, which can
  // take a while on a hardware wallet while the mid keeps moving.
  const latestRef = useRef({
    midPx,
    midsUpdatedAt,
    baseAvailable,
    quoteAvailable,
    amount,
    unit,
    limitPx,
    orderType,
  });
  latestRef.current = {
    midPx,
    midsUpdatedAt,
    baseAvailable,
    quoteAvailable,
    amount,
    unit,
    limitPx,
    orderType,
  };

  useEffect(() => {
    if (visible) {
      setOrderType('market');
      setUnit(isBuy ? 'quote' : 'base');
      setAmount('');
      setLimitPx('');
      setStalePriceAt(null);
    }
  }, [visible, isBuy]);

  // Price used for notional / balance checks. Market orders are checked at
  // the slippage-bounded limit so a buy never exceeds the available quote.
  const checkPrice = useMemo(() => {
    if (orderType === 'limit') {
      return limitPx ? formatSpotLimitPrice(limitPx, side, szDecimals) : '0';
    }
    return midPx ? getSpotMarketOrderPrice(midPx, side, szDecimals) : '0';
  }, [orderType, limitPx, midPx, side, szDecimals]);
  const hasCheckPrice = Number(checkPrice) > 0;
  // Display price: the mid for market orders (the IOC usually fills near
  // it), the limit otherwise. `checkPrice` stays the worst case used for
  // balance checks and the sent limit.
  const displayPrice =
    orderType === 'limit' ? (hasCheckPrice ? checkPrice : null) : midPx;
  // Quote amounts on market buys convert at the IOC limit so the typed
  // amount is a hard spend cap.
  const quoteConversionPrice = getSpotAmountConversionPrice({
    orderType,
    side,
    unit: 'quote',
    midPx,
    orderPrice: checkPrice,
  });

  const size = getSpotSizeFromAmount({
    amount,
    unit,
    price: quoteConversionPrice,
    szDecimals,
  });
  const quoteValue =
    displayPrice && Number(size) > 0
      ? new BigNumber(size).times(displayPrice)
      : null;

  const validationError = useMemo(
    () =>
      amount
        ? validateSpotOrder({
            side,
            size,
            price: checkPrice,
            szDecimals,
            baseAvailable,
            quoteAvailable,
            midPx,
            orderType,
          })
        : null,
    [
      amount,
      side,
      size,
      checkPrice,
      szDecimals,
      baseAvailable,
      quoteAvailable,
      midPx,
      orderType,
    ]
  );
  const orderError =
    validationError ??
    (stalePriceAt !== null && stalePriceAt === midsUpdatedAt
      ? 'stalePrice'
      : null);

  const maxAmount = useMemo(
    () =>
      unit === 'base'
        ? getSpotMaxSize({
            side,
            price: checkPrice,
            szDecimals,
            baseAvailable,
            quoteAvailable,
          })
        : getSpotMaxQuoteAmount({
            side,
            price: displayPrice,
            baseAvailable,
            quoteAvailable,
          }),
    [
      unit,
      side,
      checkPrice,
      displayPrice,
      szDecimals,
      baseAvailable,
      quoteAvailable,
    ]
  );
  const sliderValue = useMemo(() => {
    const max = Number(maxAmount);
    const current = Number(amount);
    if (!(max > 0) || !(current > 0)) {
      return 0;
    }
    return Math.min(100, Math.round((current / max) * 100));
  }, [amount, maxAmount]);

  const applyPct = useMemoizedFn((pct: number) => {
    if (!(Number(maxAmount) > 0)) {
      return;
    }
    const next = roundAmount(
      new BigNumber(maxAmount).times(pct).div(100),
      unit,
      szDecimals
    );
    setAmount(Number(next) > 0 ? next : '');
  });

  const toggleUnit = useMemoizedFn(() => {
    const nextUnit: SpotAmountUnit = unit === 'base' ? 'quote' : 'base';
    // Carry the typed amount over at the current price.
    if (amount && quoteConversionPrice) {
      const converted =
        nextUnit === 'quote'
          ? new BigNumber(amount).times(quoteConversionPrice)
          : new BigNumber(amount).div(quoteConversionPrice);
      const rounded = roundAmount(converted, nextUnit, szDecimals);
      setAmount(Number(rounded) > 0 ? rounded : '');
    }
    setUnit(nextUnit);
  });

  const handleSelectOrderType = useMemoizedFn((type: SpotOrderType) => {
    setOrderType(type);
    if (type === 'limit' && !limitPx && midPx) {
      setLimitPx(formatSpotPrice(midPx, szDecimals));
    }
  });

  const handleLimitBlur = useMemoizedFn(() => {
    if (!limitPx) {
      return;
    }
    const rounded = formatSpotLimitPrice(limitPx, side, szDecimals);
    setLimitPx(rounded === '0' ? '' : rounded);
  });

  const handleSubmit = useMemoizedFn(async () => {
    if (
      validationError ||
      !amount ||
      !(Number(size) > 0) ||
      submitLockRef.current
    ) {
      return;
    }
    if (
      orderType === 'market' &&
      Date.now() - midsUpdatedAt > SPOT_PRICE_MAX_AGE_MS
    ) {
      setStalePriceAt(midsUpdatedAt);
      refreshPrices();
      return;
    }
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      // Re-price and re-validate from the latest poll right before signing:
      // the approval step may have taken a while.
      const buildParams = () => {
        const latest = latestRef.current;
        if (
          latest.orderType === 'market' &&
          Date.now() - latest.midsUpdatedAt > SPOT_PRICE_MAX_AGE_MS
        ) {
          setStalePriceAt(latest.midsUpdatedAt);
          refreshPrices();
          return null;
        }
        const price =
          latest.orderType === 'limit'
            ? formatSpotLimitPrice(latest.limitPx, side, szDecimals)
            : latest.midPx
            ? getSpotMarketOrderPrice(latest.midPx, side, szDecimals)
            : '0';
        const nextSize = getSpotSizeFromAmount({
          amount: latest.amount,
          unit: latest.unit,
          price: getSpotAmountConversionPrice({
            orderType: latest.orderType,
            side,
            unit: latest.unit,
            midPx: latest.midPx,
            orderPrice: price,
          }),
          szDecimals,
        });
        const error = validateSpotOrder({
          side,
          size: nextSize,
          price,
          szDecimals,
          baseAvailable: latest.baseAvailable,
          quoteAvailable: latest.quoteAvailable,
          midPx: latest.midPx,
          orderType: latest.orderType,
        });
        if (error) {
          return null;
        }
        return {
          pairIndex: market.pairIndex,
          side,
          type: latest.orderType,
          size: nextSize,
          limitPx: price,
        };
      };
      const result = await executeSpotOrder(market.pairIndex, buildParams);
      if (result) {
        onSubmitted();
        onClose();
      }
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  });

  const unitName = unit === 'base' ? market.baseName : market.quoteName;
  const otherUnitName = unit === 'base' ? market.quoteName : market.baseName;
  const convertedText =
    Number(size) > 0
      ? unit === 'base'
        ? `≈ ${quoteValue ? quoteValue.toFixed(2) : '-'} ${market.quoteName}`
        : `≈ ${size} ${market.baseName}`
      : '';
  const availableText = !balances
    ? '-'
    : isBuy
    ? `${new BigNumber(quoteAvailable).toFixed(2, BigNumber.ROUND_DOWN)} ${
        market.quoteName
      }`
    : `${formatSpotSize(baseAvailable, szDecimals)} ${market.baseName}`;
  const approxPrefix = orderType === 'market' ? '≈ ' : '';
  const receiveText = isBuy
    ? Number(size) > 0
      ? `${approxPrefix}${size} ${market.baseName}`
      : '-'
    : quoteValue
    ? `${approxPrefix}${quoteValue.toFixed(2)} ${market.quoteName}`
    : '-';
  const submitTitle =
    Number(size) > 0
      ? t(
          isBuy
            ? 'page.perpsSpot.submitBuySize'
            : 'page.perpsSpot.submitSellSize',
          { size, base: market.baseName }
        )
      : t(isBuy ? 'page.perpsSpot.submitBuy' : 'page.perpsSpot.submitSell', {
          base: market.baseName,
        });
  const errorText = !hasAccount
    ? t('page.perpsSpot.loginRequired')
    : orderError
    ? t(`page.perpsSpot.error.${orderError}`, {
        min: SPOT_MIN_ORDER_NOTIONAL,
        quote: market.quoteName,
      })
    : null;
  const submitDisabled =
    !hasAccount ||
    !canTrade ||
    !amount ||
    !!orderError ||
    submitting ||
    !balances;

  return (
    <Popup
      placement="bottom"
      height={Math.min(
        POPUP_BASE_HEIGHT +
          (orderType === 'limit' ? POPUP_LIMIT_EXTRA_HEIGHT : 0),
        window.innerHeight - POPUP_TOP_GAP
      )}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={false}
      closable
      visible={visible}
      onClose={onClose}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
        <div className="flex-1 overflow-auto px-20 pt-20 pb-16">
          <div className="flex items-center justify-between pr-28">
            <div className="text-20 font-medium text-r-neutral-title-1">
              {t(
                isBuy
                  ? 'page.perpsSpot.submitBuy'
                  : 'page.perpsSpot.submitSell',
                {
                  base: market.baseName,
                }
              )}
            </div>
            <div className="text-13 text-r-neutral-foot">
              {t('page.perpsSpot.price')}{' '}
              {midPx ? formatSpotPrice(midPx, szDecimals) : '-'}
            </div>
          </div>

          <div className="mt-16 flex p-2 rounded-[8px] bg-r-neutral-card2">
            {(['market', 'limit'] as const).map((type) => (
              <div
                key={type}
                className={clsx(
                  'flex-1 h-[32px] flex items-center justify-center rounded-[6px] text-13 font-medium cursor-pointer',
                  orderType === type
                    ? 'bg-r-neutral-card1 text-r-neutral-title-1'
                    : 'text-r-neutral-foot'
                )}
                onClick={() => handleSelectOrderType(type)}
              >
                {t(`page.perpsSpot.${type}`)}
              </div>
            ))}
          </div>

          {orderType === 'limit' ? (
            <div className="mt-16">
              <div className="flex items-center justify-between mb-8 text-13">
                <span className="text-r-neutral-body">
                  {t('page.perpsSpot.limitPrice', { quote: market.quoteName })}
                </span>
                <span
                  className="text-r-blue-default cursor-pointer"
                  onClick={() =>
                    midPx && setLimitPx(formatSpotPrice(midPx, szDecimals))
                  }
                >
                  {t('page.perpsSpot.mid')}
                </span>
              </div>
              <input
                className={clsx(
                  'w-full h-[48px] px-12 rounded-[8px] bg-r-neutral-card1 text-15 font-medium',
                  'text-r-neutral-title-1 border border-solid border-rabby-neutral-line',
                  'outline-none focus:border-rabby-blue-default'
                )}
                inputMode="decimal"
                value={limitPx}
                onChange={(e) => {
                  const next = sanitizeDecimalInput(e.target.value);
                  if (next !== null) setLimitPx(next);
                }}
                onBlur={handleLimitBlur}
              />
            </div>
          ) : null}

          <div className="mt-16">
            <div className="flex items-center justify-between mb-8 text-13">
              <span className="text-r-neutral-body">
                {t('page.perpsSpot.amount')}
              </span>
              <span className="text-r-neutral-foot">
                {t('page.perpsSpot.available')}: {availableText}
              </span>
            </div>
            <div
              className={clsx(
                'flex items-center gap-8 h-[56px] px-12 rounded-[8px] bg-r-neutral-card1 border border-solid',
                orderError && amount
                  ? 'border-rabby-red-default'
                  : 'border-rabby-neutral-line focus-within:border-rabby-blue-default'
              )}
            >
              <input
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-20 font-medium text-r-neutral-title-1"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const next = sanitizeDecimalInput(e.target.value);
                  if (next !== null) setAmount(next);
                }}
              />
              <div
                className="flex items-center gap-4 px-8 h-[28px] rounded-[6px] bg-r-neutral-card2 text-13 font-medium text-r-neutral-title-1 cursor-pointer"
                title={t('page.perpsSpot.switchUnit', { unit: otherUnitName })}
                onClick={toggleUnit}
              >
                {unitName} ⇅
              </div>
            </div>
            <div className="mt-4 h-[16px] text-12 text-r-neutral-foot">
              {convertedText}
            </div>
          </div>

          <div className="mt-8">
            <PerpsSlider
              value={sliderValue}
              onValueChange={applyPct}
              disabled={!(Number(maxAmount) > 0)}
            />
            <div className="mt-8 flex gap-8">
              {QUICK_PCTS.map((pct) => (
                <div
                  key={pct}
                  className={clsx(
                    'flex-1 h-[28px] flex items-center justify-center rounded-[6px] text-12 font-medium',
                    Number(maxAmount) > 0
                      ? 'bg-r-neutral-card1 text-r-neutral-title-1 cursor-pointer hover:text-r-blue-default'
                      : 'bg-r-neutral-card1 text-r-neutral-foot cursor-not-allowed'
                  )}
                  onClick={() => applyPct(pct)}
                >
                  {pct === 100 ? t('page.perpsSpot.max') : `${pct}%`}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 flex flex-col gap-8 text-13">
            <div className="flex items-center justify-between">
              <span className="text-r-neutral-foot">
                {t('page.perpsSpot.estReceive')}
              </span>
              <span className="text-r-neutral-title-1 font-medium">
                {receiveText}
              </span>
            </div>
            {orderType === 'market' ? (
              <div className="flex items-center justify-between">
                <span className="text-r-neutral-foot">
                  {t('page.perpsSpot.maxSlippage')}
                </span>
                <span className="text-r-neutral-title-1 font-medium">
                  {SPOT_MARKET_SLIPPAGE * 100}%
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-r-neutral-foot">
                {t('page.perpsSpot.minOrder')}
              </span>
              <span className="text-r-neutral-title-1 font-medium">
                {SPOT_MIN_ORDER_NOTIONAL} {market.quoteName}
              </span>
            </div>
          </div>

          {errorText ? (
            <div className="mt-12 text-13 text-r-red-default">{errorText}</div>
          ) : null}
        </div>

        <div className="px-20 py-16 border-t border-solid border-rabby-neutral-line">
          <Button
            block
            size="large"
            type="primary"
            className={clsx(
              'h-[48px] border-none text-15 font-medium rounded-[8px] text-r-neutral-title-2',
              isBuy ? 'bg-r-green-default' : 'bg-r-red-default',
              submitDisabled && 'opacity-50'
            )}
            disabled={submitDisabled}
            loading={submitting}
            onClick={handleSubmit}
          >
            {submitTitle}
          </Button>
        </div>
      </div>
    </Popup>
  );
};
