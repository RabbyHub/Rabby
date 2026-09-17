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

interface ClosePositionPopupProps extends Omit<PopupProps, 'onCancel'> {
  visible: boolean;
  coin: string;
  direction: 'Long' | 'Short';
  positionSize: string;
  marginUsed: number;
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
  marginUsed,
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

  return (
    <Popup
      placement="bottom"
      height={478}
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
        <div className="text-20 font-medium text-r-neutral-title-1 text-center pt-16 pb-20 leading-[24px]">
          {t('page.perpsDetail.PerpsClosePositionPopup.title', {
            coin: formatPerpsCoin(coin),
          })}
        </div>

        {/* Bottom padding clears the fixed footer — limit mode overflows. */}
        <div className="flex-1 px-20 overflow-y-auto pb-[80px]">
          {/* Amount Section */}
          <div className="bg-r-neutral-card1 rounded-[20px] py-16 px-20 mb-12">
            <div className="flex justify-between items-center mb-4">
              <div className="text-20 font-bold text-r-blue-default leading-[24px]">
                {t('page.perpsDetail.PerpsClosePositionPopup.amount')}
              </div>
            </div>
            <div className="flex justify-between items-center h-[40px]">
              <div className="flex items-center gap-4">
                <span className="text-20 font-bold text-r-neutral-title-1 leading-[24px]">
                  ${splitNumberByStep(marginUsed.toFixed(2))}
                </span>
                <span className="text-15 font-medium text-r-neutral-foot leading-[22px]">
                  {t('page.perpsDetail.PerpsClosePositionPopup.total')}
                </span>
              </div>
              <span
                style={{ fontSize: '36px' }}
                className="font-bold text-r-blue-default"
              >
                {closePercent}%
              </span>
            </div>
            <div className="mb-8 h-[14px]">
              {!isValidClosePercent && (
                <span className="text-14 font-medium text-r-red-default">
                  {t(
                    'page.perpsDetail.PerpsClosePositionPopup.minimumWarning',
                    {
                      percent: minClosePercent,
                    }
                  )}{' '}
                  (${PERPS_MINI_USD_VALUE})
                </span>
              )}
            </div>
            <div className="mt-16">
              <PerpsSlider
                value={closePercent}
                onValueChange={setClosePercent}
                showPercentage={false}
              />
            </div>
          </div>

          {/* PNL Card */}
          <div className="bg-r-neutral-card1 rounded-[16px] p-16 mb-12">
            <div className="flex flex-col gap-12">
              <div className="flex justify-between items-center">
                <span className="text-14 font-medium text-rb-neutral-body leading-[18px]">
                  {t('page.perpsDetail.PerpsOpenPositionPopup.orderType')}
                </span>
                <div
                  className="flex items-center gap-4 text-14 font-medium text-r-blue-default cursor-pointer"
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
                <div className="flex justify-between items-center">
                  <span className="text-14 font-medium text-rb-neutral-body leading-[18px]">
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
              <div className="h-[0.5px] bg-r-neutral-line w-full" />
              <div className="flex justify-between items-center">
                <span className="text-14 font-medium text-rb-neutral-body leading-[18px]">
                  {t('page.perpsDetail.PerpsClosePositionPopup.receive')}
                </span>
                <span className="text-17 font-bold text-r-neutral-title-1 leading-[22px]">
                  +$
                  {splitNumberByStep(
                    ((marginUsed * closePercent) / 100).toFixed(2)
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-14 font-medium text-rb-neutral-body leading-[18px]">
                  {t('page.perpsDetail.PerpsClosePositionPopup.closedPnl')}
                </span>
                <span
                  className={clsx(
                    'text-17 font-bold leading-[22px]',
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
                labelClassName="text-14 font-medium text-rb-neutral-body leading-[18px]"
                valueClassName="text-17 font-bold leading-[22px]"
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
