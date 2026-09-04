import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Tooltip } from 'antd';
import { ScrollAwareTooltip } from './ScrollAwareTooltip';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { MarketData } from '@/ui/state/perps';
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
import { ThousandsNativeInput } from '../../ThousandsNativeInput';
import { useOrderConfirm } from '../../../modal/OrderConfirmProvider';
import type { OrderConfirmRow } from '../../../modal/OrderConfirmModal';
import { ConfirmAmount } from '../../../modal/OrderConfirmLiveValues';

const CLOSE_PERCENTAGES = [10, 25, 50, 75, 100];

interface InlineLimitCloseProps {
  record: PositionFormatData;
  marketData: MarketData;
}

export const InlineLimitClose: React.FC<InlineLimitCloseProps> = ({
  record,
  marketData,
}) => {
  const { t } = useTranslation();
  const currentPerpsAccount = useRabbySelector(
    (store) => store.perps.currentPerpsAccount
  );
  const sizeDisplayUnit = useRabbySelector(
    (state) => state.perps.sizeDisplayUnit
  );

  const selectedCoin = useRabbySelector((store) => store.perps.selectedCoin);

  const requestConfirm = useOrderConfirm();

  const szDecimals = marketData.szDecimals ?? 4;
  const pxDecimals = marketData.pxDecimals ?? 2;
  const quoteAsset = marketData.quoteAsset || 'USDC';
  const midPrice = Number(marketData.midPx || marketData.markPx || 0);
  const positionSize = Math.abs(Number(record.size || 0));
  const entryPrice = Number(record.entryPx);
  const isLong = record.direction === 'Long';

  const closeLimitCount = record.closeLimitOrders.length;
  const coinUnit =
    sizeDisplayUnit === 'usd' ? quoteAsset : formatPerpsCoin(record.coin);

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
        dex: marketData.dexId ?? '',
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
        dex: marketData.dexId ?? '',
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

  const confirmTitle = `${formatPerpsCoin(record.coin)}-${quoteAsset}`;
  // Coloured by the trade the close actually places, not by the position being
  // closed: closing a long sells (red), closing a short buys (green).
  const confirmTitleSuffix = {
    text: isLong
      ? t('page.perpsPro.orderConfirm.closeLong')
      : t('page.perpsPro.orderConfirm.closeShort'),
    tone: (isLong ? 'down' : 'up') as 'up' | 'down',
  };

  // PnL settles in the market's quote asset, not always USDC — a hardcoded
  // "USDC" would contradict the Price row above on a USDH/USDT-quoted market.
  const buildEstPnlRow = useMemoizedFn((pnl: number): OrderConfirmRow[] => {
    if (!Number.isFinite(pnl)) return [];
    const isUp = pnl >= 0;
    return [
      {
        key: 'estPnl',
        label: t('page.perpsPro.orderConfirm.estPnl'),
        value: `${isUp ? '+' : '-'}${splitNumberByStep(
          new BigNumber(Math.abs(pnl)).toFixed(2)
        )} ${quoteAsset}`,
        tone: isUp ? 'up' : 'down',
      },
    ];
  });

  const handleMarketCloseWithConfirm = useMemoizedFn(() => {
    if (marketLoading || isMarketSubmitting.current) return;

    requestConfirm({
      type: 'closeMarket',
      content: () => ({
        title: confirmTitle,
        titleSuffix: confirmTitleSuffix,
        sections: [
          {
            key: 'main',
            rows: [
              {
                key: 'price',
                label: t('page.perpsPro.orderConfirm.price'),
                value: t('page.perpsPro.orderConfirm.marketPrice'),
              },
              {
                key: 'amount',
                label: t('page.perpsPro.orderConfirm.amount'),
                value: (
                  <ConfirmAmount
                    amount={new BigNumber(positionSize).toFixed(szDecimals)}
                    coin={record.coin}
                    price={midPrice}
                    quoteAsset={quoteAsset}
                  />
                ),
              },
              // Closing the full position realizes exactly its unrealized PnL.
              ...buildEstPnlRow(Number(record.unrealizedPnl)),
            ],
          },
        ],
      }),
      dontShowAgainText: t('page.perpsPro.orderConfirm.dontShowAgain', {
        orderType: t('page.perpsPro.orderConfirm.orderTypeName.closeMarket'),
      }),
      submit: () => {
        isMarketSubmitting.current = true;
        return handleMarketClose().finally(() => {
          isMarketSubmitting.current = false;
        });
      },
    });
  });

  const handleLimitCloseWithConfirm = useMemoizedFn(() => {
    if (loading) return;

    requestConfirm({
      type: 'closeLimit',
      content: () => {
        // Mirrors the clamping inside `handleSubmit`.
        const effectiveSize =
          sizeNum >= positionSize ? positionSize.toString() : sizeInput;
        return {
          title: confirmTitle,
          titleSuffix: confirmTitleSuffix,
          sections: [
            {
              key: 'main',
              rows: [
                {
                  key: 'price',
                  label: t('page.perpsPro.orderConfirm.price'),
                  value: `${splitNumberByStep(limitPrice)} ${quoteAsset}`,
                },
                {
                  key: 'amount',
                  label: t('page.perpsPro.orderConfirm.amount'),
                  value: (
                    <ConfirmAmount
                      amount={effectiveSize}
                      coin={record.coin}
                      price={priceNum}
                      quoteAsset={quoteAsset}
                    />
                  ),
                },
                ...(priceNum && sizeNum ? buildEstPnlRow(estPnl) : []),
              ],
            },
          ],
        };
      },
      dontShowAgainText: t('page.perpsPro.orderConfirm.dontShowAgain', {
        orderType: t('page.perpsPro.orderConfirm.orderTypeName.closeLimit'),
      }),
      submit: () => handleSubmit(),
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
      handleLimitCloseWithConfirm();
    }
  });

  const priceTooltipContent = useMemo(() => {
    if (!priceNum) return null;
    const pnlIsUp = estPnl >= 0;
    return (
      <div className="text-12 space-y-[2px]">
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
      <div className="text-12 space-y-[2px]">
        {sizeDisplayUnit === 'usd' ? (
          <>
            <div>
              Position Size: {positionSize} {coin}
            </div>
            <div>
              Qty: {sizeInput} {coin} ≈ {splitNumberByStep(notionalValue)}{' '}
              {quoteAsset}
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
            sizeDisplayUnit === 'usd'
              ? new BigNumber(order.sz).multipliedBy(order.limitPx).toFixed(2)
              : order.sz;
          return (
            <div
              key={order.oid}
              className="flex items-center justify-between gap-[28px] text-12"
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
          className="text-rb-brand-default cursor-pointer text-12 hover:text-r-neutral-title-1 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            if (!marketLoading) handleMarketCloseWithConfirm();
          }}
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
              'cursor-pointer text-12 transition-colors text-rb-brand-default hover:text-r-neutral-title-1'
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (isPriceValid && sizeNum > 0 && !loading) {
                setShowValidation(false);
                handleLimitCloseWithConfirm();
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
        <ThousandsNativeInput
          className={clsx(
            'w-[68px] h-[24px] px-[6px] text-[11px] rounded-[3px] outline-none',
            'bg-transparent text-r-neutral-body',
            'border border-solid',
            !isPriceValid
              ? 'border-rb-red-default'
              : priceFocused
              ? 'border-rb-brand-default'
              : 'border-rb-neutral-line hover:border-rb-brand-default'
          )}
          placeholder="Price"
          value={limitPrice}
          onClick={(e) => e.stopPropagation()}
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
                  className="text-13 text-rb-neutral-title-1 bg-rb-neutral-line hover:text-rb-brand-default cursor-pointer px-[11px] h-[24px] flex items-center justify-center rounded-[3px]"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePercentageClick(pct);
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {pct}%
                </span>
              ))}
            </div>
          }
        >
          <ThousandsNativeInput
            ref={sizeInputRef}
            className={clsx(
              'w-[60px] h-[24px] px-[6px] text-[11px] rounded-[3px] outline-none',
              'bg-transparent text-r-neutral-body',
              'border border-solid',
              isSizeOverMax || sizeNum <= 0
                ? 'border-rb-red-default'
                : sizeFocused
                ? 'border-rb-brand-default'
                : 'border-rb-neutral-line hover:border-rb-brand-default'
            )}
            placeholder="Size"
            value={sizeInput}
            onClick={(e) => e.stopPropagation()}
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
