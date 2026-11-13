import React, { useMemo } from 'react';
import { Button, Tooltip } from 'antd';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import { ReactComponent as RcIconInfo } from 'ui/assets/perps/RcIconInfoCC.svg';
import { ReactComponent as RcIconModeSwitch } from 'ui/assets/perps/IconModeSwitch.svg';
import { useMemoizedFn } from 'ahooks';
import { MarketData } from '@/ui/state/perps';
import { formatPercent, formatTpOrSlPrice } from '../utils';
import {
  PERPS_EXCHANGE_FEE_NUMBER,
  PERPS_MINI_USD_VALUE,
  PerpsOpenOrderType,
} from '../constants';
import { PerpsSlider } from '../components/PerpsSlider';
import { MarketSlippage } from '../components/MarketSlippage';
import { EditLimitPriceTag } from '../components/EditLimitPriceTag';
import { useMarketSlippage } from '../hooks/useMarketSlippage';
import { isMarketableLimit } from '../limitOrderUtils';
import { formatPerpsCoin } from '../../DesktopPerps/utils';
import { closeQuantitySummary } from '../positionDisplay';

// Fixed at the tallest single-line state (mirrors mobile): title 56 +
// Amount card, warning line always reserved, 173 + gap 12 + order card with three
// rows (limit price, or market slippage) 126 + footer 80. Shorter states
// leave the spare space below the cards; translations can still scroll.
const CLOSE_POPUP_HEIGHT = 447;

interface ClosePositionPopupProps extends Omit<PopupProps, 'onCancel'> {
  visible: boolean;
  coin: string;
  direction: 'Long' | 'Short';
  positionSize: string;
  quoteAsset?: string;
  markPrice: number;
  entryPrice: number;
  szDecimals: number;
  currentAssetCtx?: MarketData;
  providerFee: number;
  pnl: number;
  onCancel: () => void;
  onConfirm: () => void;
  handleClosePosition: (params: {
    closePercent: number;
    orderType: PerpsOpenOrderType;
    limitPx?: string;
  }) => Promise<void>;
}

export const ClosePositionPopup: React.FC<ClosePositionPopupProps> = ({
  visible,
  coin,
  direction,
  positionSize,
  quoteAsset = 'USDC',
  markPrice,
  entryPrice,
  szDecimals,
  currentAssetCtx,
  providerFee,
  pnl,
  onCancel,
  onConfirm,
  handleClosePosition,
  ...rest
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [closePercent, setClosePercent] = React.useState<number>(100);
  const [orderType, setOrderType] = React.useState<PerpsOpenOrderType>(
    'market'
  );
  const [limitPx, setLimitPx] = React.useState<string>('');

  // Close trades opposite the position: long -> sell, short -> buy.
  const closeSide: 'Long' | 'Short' = direction === 'Long' ? 'Short' : 'Long';

  const isLimit = orderType === 'limit';
  const hasLimitPx = Number(limitPx) > 0;

  /** The user's intended exit price: the typed limit, else the mark. */
  const effectivePx = useMemo(() => {
    return isLimit && hasLimitPx ? Number(limitPx) : markPrice;
  }, [isLimit, hasLimitPx, limitPx, markPrice]);

  // A marketable limit close (closing long = sell at/below mark, closing
  // short = buy at/above mark) fills immediately at ~mark, so size estimates
  // price against markPrice rather than the typed limit.
  const isMarketable = useMemo(
    () =>
      isLimit &&
      isMarketableLimit({
        direction: closeSide,
        limitPx,
        markPx: markPrice,
      }),
    [isLimit, closeSide, limitPx, markPrice]
  );
  const estimatePx = isMarketable ? markPrice : effectivePx;

  const closePosition = useMemoizedFn(async () => {
    setLoading(true);
    try {
      await handleClosePosition({
        closePercent,
        orderType,
        limitPx: isLimit ? limitPx : undefined,
      });
      onConfirm();
    } finally {
      setLoading(false);
    }
  });

  const switchOrderType = useMemoizedFn((next: PerpsOpenOrderType) => {
    setOrderType(next);
    setLimitPx(
      next === 'limit' ? formatTpOrSlPrice(markPrice, szDecimals) : ''
    );
  });

  const minClosePercent = useMemo(() => {
    const minSizeValue = PERPS_MINI_USD_VALUE / estimatePx;
    const percentValue = (minSizeValue / Number(positionSize)) * 100;

    // add one percent to avoid rounding error
    return Math.min(100, Math.round(percentValue + 1));
  }, [estimatePx, positionSize]);

  React.useEffect(() => {
    if (!visible) {
      setLoading(false);
      setClosePercent(100);
      setOrderType('market');
      setLimitPx('');
    }
  }, [visible]);

  const closedPnl = useMemo(() => {
    // A resting limit close settles at limitPx, not at the current mark — the
    // `pnl` prop is unrealized PNL marked to market, so recompute from entry.
    if (isLimit && hasLimitPx) {
      const sizeToClose = (Number(positionSize) * closePercent) / 100;
      const delta = Number(limitPx) - entryPrice;
      return (direction === 'Long' ? delta : -delta) * sizeToClose;
    }
    return (pnl * closePercent) / 100;
  }, [
    pnl,
    closePercent,
    isLimit,
    hasLimitPx,
    limitPx,
    entryPrice,
    positionSize,
    direction,
  ]);

  const {
    slippage,
    depthInsufficient,
    isReady: slippageReady,
    shouldShow: shouldShowSlippage,
  } = useMarketSlippage({
    coin,
    isBuy: closeSide === 'Long',
    size: Number(positionSize) * (closePercent / 100),
    markPrice,
    enabled: visible && !isLimit,
  });

  const bothFee = useMemo(() => {
    return providerFee + PERPS_EXCHANGE_FEE_NUMBER;
  }, [providerFee]);

  const isValidClosePercent = useMemo(() => {
    if (loading) {
      return true;
    }

    return closePercent >= minClosePercent;
  }, [closePercent, minClosePercent, loading]);

  const confirmDisabled = !isValidClosePercent || (isLimit && !hasLimitPx);

  const quantity = closeQuantitySummary(
    positionSize,
    closePercent,
    szDecimals,
    markPrice
  );

  return (
    <Popup
      placement="bottom"
      height={CLOSE_POPUP_HEIGHT}
      isSupportDarkMode
      // Drops the global 1.5px top border on .ant-drawer-content.
      className="borderless"
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={false}
      closable
      visible={visible}
      onCancel={onCancel}
      {...rest}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
        <div className="text-20 font-medium text-r-neutral-title-1 text-center pt-16 pb-16 leading-[24px]">
          {t('page.perpsDetail.PerpsClosePositionPopup.title', {
            coin: formatPerpsCoin(coin),
          })}
        </div>

        {/* Bottom padding clears the fixed footer — limit mode overflows. */}
        <div className="flex-1 px-20 overflow-y-auto pb-[80px]">
          {/* Amount Section */}
          <div className="bg-r-neutral-card1 rounded-[8px] p-16 mb-12">
            <div className="text-[17px] font-bold text-r-neutral-title-1 leading-[20px]">
              {t('page.perpsDetail.PerpsClosePositionPopup.amount')}
            </div>
            <div className="mt-12 flex flex-col gap-4">
              <div className="text-28 font-bold leading-[33px] text-r-blue-default">
                {closePercent}%
              </div>
              <div className="text-13 font-medium leading-[18px] text-r-neutral-foot">
                {splitNumberByStep(quantity.notional)} {quoteAsset} ={' '}
                {quantity.quantity} {formatPerpsCoin(coin)}
              </div>
              {/* The warning line is always reserved so the card never
                  changes height when it toggles. */}
              <div className="min-h-[18px] text-14 font-medium leading-[18px] text-r-red-default">
                {!isValidClosePercent && (
                  <>
                    {t(
                      'page.perpsDetail.PerpsClosePositionPopup.minimumWarning',
                      {
                        percent: minClosePercent,
                      }
                    )}{' '}
                    (${PERPS_MINI_USD_VALUE})
                  </>
                )}
              </div>
            </div>
            {/* Pinned to 20px so the fixed popup height does not depend on
                antd's slider margins. */}
            <div className="mt-12 h-[20px] flex items-center">
              <PerpsSlider
                value={closePercent}
                onValueChange={setClosePercent}
                showPercentage={false}
              />
            </div>
          </div>

          {/* Order Card — rows pinned to 34px so the fixed height holds. */}
          <div className="bg-r-neutral-card1 rounded-[8px] py-8 flex flex-col gap-8">
            <div className="flex flex-col">
              <div className="flex justify-between items-center px-16 h-[34px]">
                <span className="text-13 font-medium text-r-neutral-foot leading-[18px]">
                  {t('page.perpsDetail.PerpsOpenPositionPopup.orderType')}
                </span>
                <div
                  className="flex items-center gap-4 text-13 font-medium leading-[16px] text-r-blue-default cursor-pointer"
                  onClick={() => switchOrderType(isLimit ? 'market' : 'limit')}
                >
                  {isLimit
                    ? t(
                        'page.perpsDetail.PerpsOpenPositionPopup.orderTypeLimit'
                      )
                    : t(
                        'page.perpsDetail.PerpsOpenPositionPopup.orderTypeMarket'
                      )}
                  <RcIconModeSwitch />
                </div>
              </div>
              {isLimit && (
                <div className="flex justify-between items-center px-16 h-[34px]">
                  <span className="text-13 font-medium text-r-neutral-foot leading-[18px]">
                    {t('page.perpsDetail.PerpsOpenPositionPopup.limitPrice')}
                  </span>
                  <EditLimitPriceTag
                    currentAssetCtx={currentAssetCtx}
                    markPrice={markPrice}
                    szDecimals={szDecimals}
                    direction={closeSide}
                    limitPx={limitPx}
                    onChange={setLimitPx}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex justify-between items-center px-16 h-[34px]">
                <span className="text-14 font-medium text-r-neutral-foot leading-[18px]">
                  {t('page.perpsDetail.PerpsClosePositionPopup.closedPnl')}
                </span>
                <span
                  className={clsx(
                    'text-13 font-medium leading-[18px]',
                    closedPnl >= 0
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {closedPnl >= 0 ? '+' : '-'}$
                  {splitNumberByStep(Math.abs(closedPnl).toFixed(2))}
                </span>
              </div>
              <MarketSlippage
                visible={
                  !isLimit &&
                  slippageReady &&
                  Number(positionSize) > 0 &&
                  shouldShowSlippage
                }
                slippage={slippage}
                depthInsufficient={depthInsufficient}
                rowClassName="px-16 h-[34px]"
                labelClassName="text-14 font-medium text-r-neutral-foot leading-[18px]"
                valueClassName="text-13 font-medium leading-[18px]"
              />
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 px-20 py-16 flex flex-col">
            <Button
              block
              size="large"
              type="primary"
              className="h-[48px] text-15 font-medium"
              onClick={closePosition}
              loading={loading}
              disabled={confirmDisabled}
            >
              {t('page.perpsDetail.PerpsClosePositionPopup.confirm')}
            </Button>
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default ClosePositionPopup;
