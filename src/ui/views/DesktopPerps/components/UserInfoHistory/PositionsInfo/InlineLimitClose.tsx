import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button, Modal, Tooltip } from 'antd';
import { ScrollAwareTooltip } from './ScrollAwareTooltip';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { MarketData } from '@/ui/models/perps';
import { calculatePnL } from '../../TradingPanel/utils';
import { validatePriceInput, formatTpOrSlPrice } from '@/ui/views/Perps/utils';
import { validateAmountInput } from '../../TradingPanel/utils';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { formatPerpsCoin, formatPerpsValueWithUsdc } from '../../../utils';
import { ReactComponent as RcIconPerpsDelete } from '@/ui/assets/perps/IconPerpsDelete.svg';
import { PositionFormatData } from './index';
import stats from '@/stats';
import { getStatsReportSide } from '../../../utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { PerpsBlueBorderedButton } from '@/ui/views/Perps/components/BlueBorderedButton';
import { PerpsCheckbox } from '../../TradingPanel/components/PerpsCheckbox';

const CLOSE_PERCENTAGES = [10, 25, 50, 75, 100];

const MarketCloseCheckbox: React.FC<{
  defaultChecked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ defaultChecked, onChange }) => {
  const [checked, setChecked] = useState(defaultChecked);
  const { t } = useTranslation();
  const title = t('page.perpsPro.userInfo.positionInfo.dontShowAgain');
  return (
    <PerpsCheckbox
      checked={checked}
      onChange={(val) => {
        setChecked(val);
        onChange(val);
      }}
      title={<span className="text-r-neutral-foot text-[12px]">{title}</span>}
    />
  );
};

interface InlineLimitCloseProps {
  record: PositionFormatData;
  marketData: MarketData;
}

export const InlineLimitClose: React.FC<InlineLimitCloseProps> = ({
  record,
  marketData,
}) => {
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();
  const dispatch = useRabbyDispatch();
  const currentPerpsAccount = useRabbySelector(
    (store) => store.perps.currentPerpsAccount
  );
  const sizeDisplayUnit = useRabbySelector(
    (state) => state.perps.sizeDisplayUnit
  );
  const skipMarketCloseConfirm = useRabbySelector(
    (state) => state.perps.skipMarketCloseConfirm
  );

  const selectedCoin = useRabbySelector((store) => store.perps.selectedCoin);

  const szDecimals = marketData.szDecimals ?? 4;
  const pxDecimals = marketData.pxDecimals ?? 2;
  const midPrice = Number(marketData.midPx || marketData.markPx || 0);
  const positionSize = Math.abs(Number(record.size || 0));
  const entryPrice = Number(record.entryPx);
  const isLong = record.direction === 'Long';

  const closeLimitCount = record.closeLimitOrders.length;
  const coinUnit =
    sizeDisplayUnit === 'usdc' ? 'USD' : formatPerpsCoin(record.coin);

  const [limitPrice, setLimitPrice] = useState(
    formatTpOrSlPrice(midPrice, szDecimals)
  );
  const hasFillLimitPrice = React.useRef(false);
  useEffect(() => {
    if (!hasFillLimitPrice.current && midPrice) {
      const price = formatTpOrSlPrice(midPrice, szDecimals);
      setLimitPrice(price);
      hasFillLimitPrice.current = true;
    }
  }, [midPrice, szDecimals]);

  const [sizeInput, setSizeInput] = useState(record.size);
  const [priceFocused, setPriceFocused] = useState(false);
  const [priceHovered, setPriceHovered] = useState(false);
  const [sizeFocused, setSizeFocused] = useState(false);
  const [sizeHovered, setSizeHovered] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Tooltip：focus > hover , only show one tips
  const anyFocused = priceFocused || sizeFocused;
  const showPriceTooltip = priceFocused || (priceHovered && !anyFocused);
  const showSizeTooltip = sizeFocused || (sizeHovered && !anyFocused);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickPrice = (price: string) => {
      if (selectedCoin === record.coin) {
        setLimitPrice(price.toString());
      }
    };
    eventBus.addEventListener(
      EVENTS.PERPS.HANDLE_CLICK_PRICE,
      handleClickPrice
    );

    eventBus.addEventListener(
      EVENTS.PERPS.SWITCH_LIMIT_FILL_PRICE,
      handleClickPrice
    );

    return () => {
      eventBus.removeEventListener(
        EVENTS.PERPS.HANDLE_CLICK_PRICE,
        handleClickPrice
      );
      eventBus.removeEventListener(
        EVENTS.PERPS.SWITCH_LIMIT_FILL_PRICE,
        handleClickPrice
      );
    };
  }, [selectedCoin]);

  useEffect(() => {
    if (selectedCoin === record.coin) {
      setLimitPrice(formatTpOrSlPrice(midPrice, szDecimals));
    }
  }, [selectedCoin]);

  // When size input is focused, check if the bottom tooltip (percentage buttons ~40px)
  // would be clipped by the scroll container. If so, scroll the table body to make room.
  const ensureBottomSpace = useCallback(() => {
    const el = sizeInputRef.current;
    if (!el) return;
    const scrollContainer = el.closest('.ant-table-body') as HTMLElement;
    if (!scrollContainer) return;

    const BOTTOM_TOOLTIP_HEIGHT = 48;
    const elRect = el.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const spaceBelow = containerRect.bottom - elRect.bottom;

    if (spaceBelow < BOTTOM_TOOLTIP_HEIGHT) {
      scrollContainer.scrollBy({
        top: BOTTOM_TOOLTIP_HEIGHT - spaceBelow,
        behavior: 'smooth',
      });
    }
  }, []);

  const priceNum = Number(limitPrice) || 0;
  const sizeNum = Number(sizeInput) || 0;

  const isPriceValid = useMemo(() => {
    if (!limitPrice || limitPrice === '0') return false;
    return priceNum > 0;
  }, [limitPrice, priceNum]);

  const isSizeOverMax = sizeNum > positionSize;

  const estPnl = useMemo(() => {
    if (!priceNum || !sizeNum) return 0;
    const effectiveSize = Math.min(sizeNum, positionSize);
    return calculatePnL(
      priceNum,
      isLong ? 'Long' : 'Short',
      effectiveSize,
      entryPrice
    );
  }, [priceNum, sizeNum, positionSize, isLong, entryPrice]);

  const notionalValue = useMemo(() => {
    if (!priceNum || !sizeNum) return '0';
    return new BigNumber(sizeNum).multipliedBy(priceNum).toFixed(2);
  }, [priceNum, sizeNum]);

  const {
    handleOpenLimitOrder,
    handleCancelOrder,
    handleCloseWithMarketOrder,
  } = usePerpsProPosition();

  const isMarketSubmitting = useRef(false);

  const { loading, runAsync: handleSubmit } = useRequest(
    async () => {
      const priceVal = Number(limitPrice);
      const sizeVal = Number(sizeInput);
      if (!priceVal || priceVal <= 0 || !sizeVal || sizeVal <= 0) return;

      const isBuy = record.direction === 'Short';
      let effectiveSize = sizeInput;
      if (sizeVal >= positionSize) {
        effectiveSize = positionSize.toString();
      }

      await handleOpenLimitOrder({
        coin: record.coin,
        isBuy,
        size: effectiveSize,
        limitPx: limitPrice,
        reduceOnly: true,
      });

      stats.report('perpsTradeHistory', {
        created_at: new Date().getTime(),
        user_addr: currentPerpsAccount?.address || '',
        trade_type: 'close limit',
        leverage: record.leverage.toString(),
        trade_side: getStatsReportSide(isBuy, true),
        margin_mode: record.type === 'cross' ? 'cross' : 'isolated',
        coin: record.coin,
        size: effectiveSize,
        price: limitPrice,
        trade_usd_value: new BigNumber(limitPrice)
          .times(effectiveSize)
          .toFixed(2),
        service_provider: 'hyperliquid',
        app_version: process.env.release || '0',
        address_type: currentPerpsAccount?.type || '',
      });
    },
    {
      manual: true,
      onSuccess: () => {},
    }
  );

  const { loading: marketLoading, runAsync: handleMarketClose } = useRequest(
    async () => {
      const isBuy = record.direction === 'Short';
      const size = new BigNumber(positionSize).toFixed(szDecimals);
      const res = await handleCloseWithMarketOrder({
        coin: record.coin,
        isBuy,
        size,
        midPx: String(midPrice),
        reduceOnly: true,
      });
      if (res) {
        const { totalSz, avgPx } = res;
        stats.report('perpsTradeHistory', {
          created_at: new Date().getTime(),
          user_addr: currentPerpsAccount?.address || '',
          trade_type: 'close market',
          leverage: record.leverage.toString(),
          trade_side: getStatsReportSide(isBuy, true),
          margin_mode: record.type === 'cross' ? 'cross' : 'isolated',
          coin: record.coin,
          size: totalSz,
          price: avgPx,
          trade_usd_value: new BigNumber(avgPx).times(totalSz).toFixed(2),
          service_provider: 'hyperliquid',
          app_version: process.env.release || '0',
          address_type: currentPerpsAccount?.type || '',
        });
      }
    },
    {
      manual: true,
    }
  );

  const handleMarketCloseWithConfirm = useMemoizedFn(() => {
    if (marketLoading || isMarketSubmitting.current) return;

    if (skipMarketCloseConfirm) {
      isMarketSubmitting.current = true;
      handleMarketClose().finally(() => {
        isMarketSubmitting.current = false;
      });
      return;
    }

    const dontShowAgainRef = { current: true };
    const modal = Modal.info({
      width: 400,
      closable: false,
      maskClosable: true,
      centered: true,
      title: null,
      icon: null,
      // bodyStyle: { padding: 0 },
      className: clsx(
        'perps-bridge-swap-modal perps-close-all-position-modal',
        isDarkTheme
          ? 'perps-bridge-swap-modal-dark'
          : 'perps-bridge-swap-modal-light'
      ),
      content: (
        <div className="flex items-center justify-center flex-col gap-12">
          <div className="text-[16px] font-bold text-r-neutral-title-1 text-center">
            {t('page.perpsPro.userInfo.positionInfo.marketCloseTitle')}
          </div>
          <div className="text-[13px] leading-[16px] text-rb-neutral-foot text-center mb-[20px]">
            {t('page.perpsPro.userInfo.positionInfo.marketCloseDesc')}
          </div>
          <MarketCloseCheckbox
            defaultChecked={true}
            onChange={(checked) => {
              dontShowAgainRef.current = checked;
            }}
          />
          <div className="flex items-center justify-center w-full gap-12 mt-[12px]">
            <PerpsBlueBorderedButton block onClick={() => modal.destroy()}>
              {t('page.manageAddress.cancel')}
            </PerpsBlueBorderedButton>
            <Button
              size="large"
              block
              type="primary"
              onClick={() => {
                if (dontShowAgainRef.current) {
                  dispatch.perps.updateSkipMarketCloseConfirm(true);
                }
                handleMarketClose();
                modal.destroy();
              }}
            >
              {t('page.perpsPro.userInfo.positionInfo.marketCloseBtn')}
            </Button>
          </div>
        </div>
      ),
    });
  });

  const handlePriceChange = useMemoizedFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === '' || validatePriceInput(val, szDecimals)) {
        setLimitPrice(val);
      }
    }
  );

  const handleSizeChange = useMemoizedFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === '' || validateAmountInput(val, szDecimals)) {
        setSizeInput(val);
      }
    }
  );

  const handlePercentageClick = useMemoizedFn((pct: number) => {
    const amount = new BigNumber(positionSize)
      .multipliedBy(pct)
      .div(100)
      .toFixed(szDecimals, BigNumber.ROUND_DOWN);
    setSizeInput(amount);
  });

  useEffect(() => {
    if (!sizeFocused) {
      setSizeInput(record.size);
    }
  }, [record.size]);

  const handleKeyDown = useMemoizedFn((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isPriceValid && sizeNum > 0 && !loading) {
      handleSubmit();
    }
  });

  const priceTooltipContent = useMemo(() => {
    if (!priceNum) return null;
    const pnlIsUp = estPnl >= 0;
    return (
      <div className="text-[12px] space-y-[2px]">
        <div>Price: {splitNumberByStep(limitPrice)}</div>
        {Boolean(Number(estPnl)) && (
          <div>
            Est. PNL:{' '}
            <span
              className={
                pnlIsUp ? 'text-r-green-default' : 'text-r-red-default'
              }
            >
              {pnlIsUp ? '+' : '-'}
              {formatPerpsValueWithUsdc(Math.abs(estPnl))}
            </span>
          </div>
        )}
      </div>
    );
  }, [priceNum, limitPrice, estPnl]);

  const sizeTooltipContent = useMemo(() => {
    if (!sizeNum) return null;
    const coin = formatPerpsCoin(record.coin);
    const pnlIsUp = estPnl >= 0;
    return (
      <div className="text-[12px] space-y-[2px]">
        {sizeDisplayUnit === 'usdc' ? (
          <>
            <div>
              Position Size: {positionSize} {coin}
            </div>
            <div>
              Qty: {sizeInput} {coin} ≈ {splitNumberByStep(notionalValue)} USD
            </div>
          </>
        ) : (
          <div>
            Qty: {sizeInput} {coin}
          </div>
        )}
        {Boolean(Number(estPnl)) && (
          <div>
            Est. PNL:{' '}
            <span
              className={
                pnlIsUp ? 'text-r-green-default' : 'text-r-red-default'
              }
            >
              {pnlIsUp ? '+' : '-'}
              {formatPerpsValueWithUsdc(Math.abs(estPnl))}
            </span>
          </div>
        )}
      </div>
    );
  }, [
    sizeNum,
    sizeInput,
    record.coin,
    sizeDisplayUnit,
    positionSize,
    notionalValue,
    estPnl,
  ]);

  const limitOrdersTooltip = useMemo(() => {
    if (closeLimitCount === 0) return undefined;
    return (
      <div className="space-y-[4px] px-2">
        {record.closeLimitOrders.map((order) => {
          const orderSize =
            sizeDisplayUnit === 'usdc'
              ? new BigNumber(order.sz).multipliedBy(order.limitPx).toFixed(2)
              : order.sz;
          return (
            <div
              key={order.oid}
              className="flex items-center justify-between gap-[28px] text-[12px]"
            >
              <span>
                {splitNumberByStep(orderSize)} {coinUnit} to be closed @$
                {splitNumberByStep(order.limitPx)}
              </span>
              <RcIconPerpsDelete
                className="text-rb-neutral-foot hover:text-rb-brand-default cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelOrder([{ oid: order.oid, coin: order.coin }]);
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }, [closeLimitCount, record.closeLimitOrders, sizeDisplayUnit, coinUnit]);

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-[8px]"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center gap-[6px]">
        {/* Market link */}
        <span
          className="text-rb-brand-default cursor-pointer font-bold text-[12px] hover:text-r-neutral-title-1 transition-colors"
          onClick={() => !marketLoading && handleMarketCloseWithConfirm()}
        >
          Market
        </span>

        <div className="w-[1px] h-[12px] bg-rb-neutral-line" />

        {/* Limit link — click to submit */}
        <Tooltip
          title={limitOrdersTooltip}
          align={{ offset: [0, -4] }}
          placement="bottomRight"
          // overlayClassName="rectangle"
        >
          <span
            className={clsx(
              'cursor-pointer font-bold text-[12px] transition-colors text-rb-brand-default hover:text-r-neutral-title-1'
            )}
            onClick={() => {
              if (isPriceValid && sizeNum > 0 && !loading) {
                setShowValidation(false);
                handleSubmit();
              } else {
                setShowValidation(true);
              }
            }}
          >
            Limit{closeLimitCount > 0 ? `(${closeLimitCount})` : ''}
          </span>
        </Tooltip>
      </div>

      {/* Price input */}
      <ScrollAwareTooltip
        visible={showPriceTooltip && isPriceValid && !!priceTooltipContent}
        placement="top"
        overlayClassName="rectangle"
        title={priceTooltipContent}
      >
        <input
          className={clsx(
            'w-[68px] h-[24px] px-[6px] text-[11px] rounded-[4px] outline-none',
            'bg-transparent text-r-neutral-title-1',
            'border border-solid',
            !isPriceValid
              ? 'border-rb-red-default'
              : priceFocused
              ? 'border-rb-brand-default'
              : 'border-rb-neutral-line hover:border-rb-brand-default'
          )}
          placeholder="Price"
          value={limitPrice}
          onChange={(e) => {
            handlePriceChange(e);
            if (showValidation) setShowValidation(false);
          }}
          onFocus={() => setPriceFocused(true)}
          onBlur={() => setPriceFocused(false)}
          onMouseEnter={() => setPriceHovered(true)}
          onMouseLeave={() => setPriceHovered(false)}
        />
      </ScrollAwareTooltip>

      {/* Size input — top: info tooltip, bottom: percentage buttons */}
      <ScrollAwareTooltip
        visible={
          showSizeTooltip &&
          !!sizeTooltipContent &&
          !isSizeOverMax &&
          !(showValidation && sizeNum <= 0)
        }
        placement="top"
        overlayClassName="rectangle"
        title={sizeTooltipContent}
      >
        <ScrollAwareTooltip
          visible={sizeFocused}
          placement="bottom"
          overlayClassName="rectangle"
          title={
            <div className="flex items-center gap-[6px]">
              {CLOSE_PERCENTAGES.map((pct) => (
                <span
                  key={pct}
                  className="text-13 text-rb-neutral-title-1 bg-rb-neutral-line hover:text-rb-brand-default cursor-pointer px-[11px] h-[24px] flex items-center justify-center rounded-[4px]"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handlePercentageClick(pct);
                  }}
                >
                  {pct}%
                </span>
              ))}
            </div>
          }
        >
          <input
            ref={sizeInputRef}
            className={clsx(
              'w-[60px] h-[24px] px-[6px] text-[11px] rounded-[4px] outline-none',
              'bg-transparent text-r-neutral-title-1',
              'border border-solid',
              isSizeOverMax || sizeNum <= 0
                ? 'border-rb-red-default'
                : sizeFocused
                ? 'border-rb-brand-default'
                : 'border-rb-neutral-line hover:border-rb-brand-default'
            )}
            placeholder="Size"
            value={sizeInput}
            onChange={(e) => {
              handleSizeChange(e);
              if (showValidation) setShowValidation(false);
            }}
            onFocus={() => {
              setSizeFocused(true);
              requestAnimationFrame(ensureBottomSpace);
            }}
            onBlur={() => setSizeFocused(false)}
            onMouseEnter={() => setSizeHovered(true)}
            onMouseLeave={() => setSizeHovered(false)}
          />
        </ScrollAwareTooltip>
      </ScrollAwareTooltip>
    </div>
  );
};
