import React, { useMemo } from 'react';
import clsx from 'clsx';
import { AssetPosition, OpenOrder } from '@rabby-wallet/hyperliquid-sdk';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { MarketData } from '@/ui/models/perps';
import { TokenImg } from './TokenImg';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { PerpsBlueBorderedButton } from './BlueBorderedButton';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { format } from 'path';
import { formatPerpsCoin } from '../../DesktopPerps/utils';
import { DistanceRiskTag } from '../../DesktopPerps/components/UserInfoHistory/PositionsInfo/DistanceRiskTag';
import { calculateDistanceToLiquidation, formatPerpsPct } from '../utils';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

const formatPct = (v: number) => `${(v * 100).toFixed(2)}%`;

export const PositionItem: React.FC<{
  position: AssetPosition['position'];
  marketData?: MarketData;
  openOrders?: OpenOrder[];
  handleClosePosition: (position: AssetPosition['position']) => void;
  handleNavigate: () => void;
  onShowRiskPopup?: (coin: string) => void;
}> = ({
  position,
  handleClosePosition,
  handleNavigate,
  marketData,
  openOrders,
  onShowRiskPopup,
}) => {
  const { t } = useTranslation();
  const {
    coin,
    szi,
    leverage,
    positionValue,
    marginUsed,
    unrealizedPnl,
    returnOnEquity,
    liquidationPx,
    entryPx,
  } = position;

  const isUp = Number(unrealizedPnl) >= 0;
  const isLong = Number(szi) > 0;
  const side = isLong ? 'Long' : 'Short';
  const leverageType = leverage.type; // 'cross' | 'isolated'

  const absPnlUsd = Math.abs(Number(unrealizedPnl));
  const absPnlPct = Math.abs(Number(returnOnEquity));
  const pnlText = `${isUp ? '+' : '-'}$${splitNumberByStep(
    absPnlUsd.toFixed(2)
  )}`;

  const logoUrl = marketData?.logoUrl || '';
  const leverageText = `${leverage.value}x`;
  const markPrice = marketData?.markPx || '0';

  // 持仓大小
  const positionSize = Math.abs(Number(szi));

  // Get TP/SL from open orders
  const { tpPrice, slPrice } = useMemo(() => {
    if (!openOrders || !openOrders.length) {
      return {
        tpPrice: undefined,
        slPrice: undefined,
      };
    }

    const tpItem = openOrders.find(
      (order) =>
        order.orderType === 'Take Profit Market' &&
        order.isTrigger &&
        order.isPositionTpsl &&
        order.reduceOnly
    );

    const slItem = openOrders.find(
      (order) =>
        order.orderType === 'Stop Market' &&
        order.isTrigger &&
        order.isPositionTpsl &&
        order.reduceOnly
    );

    return {
      tpPrice: Number(tpItem?.triggerPx || 0),
      slPrice: Number(slItem?.triggerPx || 0),
    };
  }, [openOrders]);

  // Check if there's take profit or stop loss
  const hasTakeProfit = !!tpPrice;
  const hasStopLoss = !!slPrice;

  return (
    <div
      className={clsx(
        'w-full bg-r-neutral-card1 rounded-[8px] flex flex-col cursor-pointer',
        'border-[1px]',
        'border-solid border-transparent',
        'hover:bg-r-blue-light1 hover:border-rabby-blue-default',
        (hasTakeProfit || hasStopLoss) && 'pb-2'
      )}
      onClick={handleNavigate}
    >
      <div className={clsx('flex items-center justify-between px-16 py-12')}>
        <div className="flex flex-col gap-8 flex-1">
          <div className="flex items-center relative">
            <TokenImg
              logoUrl={logoUrl}
              direction={side}
              withDirection={false}
              size={20}
            />
            <span className="text-15 ml-4 font-medium text-r-neutral-title-1">
              {formatPerpsCoin(coin)}
            </span>
            <TooltipWithMagnetArrow
              overlayClassName="rectangle"
              placement="top"
              title={
                leverageType === 'cross'
                  ? t('page.perps.crossMarginLiqPriceTip')
                  : undefined
              }
            >
              <span className="ml-4 text-[12px] font-medium px-4 h-[18px] flex items-center justify-center rounded-[4px] bg-r-neutral-card2 text-r-neutral-foot gap-2">
                {leverageType === 'cross'
                  ? t('page.perps.cross')
                  : t('page.perps.isolated')}
                {leverageType === 'cross' && (
                  <RcIconInfo
                    viewBox="0 0 14 14"
                    width={12}
                    height={12}
                    className="text-r-neutral-foot"
                  />
                )}
              </span>
            </TooltipWithMagnetArrow>
            {/* <RcIconArrowRight className="w-20 h-20 mr-[-6px] text-rb-neutral-foot" /> */}
          </div>
          <div className="flex items-center gap-6">
            <span
              className={clsx(
                'text-[12px] font-medium px-4 h-[18px] flex items-center justify-center rounded-[4px]',
                isLong
                  ? 'text-r-green-default bg-r-green-light'
                  : 'text-r-red-default bg-r-red-light'
              )}
            >
              {side} {leverageText}
            </span>
            {!hasStopLoss && (
              <DistanceRiskTag
                isLong={isLong}
                percent={formatPerpsPct(
                  calculateDistanceToLiquidation(liquidationPx, markPrice)
                )}
              />
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-4">
          <div className="text-15 font-medium text-r-neutral-title-1">
            {formatUsdValue(Number(marginUsed))}
          </div>
          <div
            className={clsx(
              'text-13 font-medium',
              isUp ? 'text-rb-green-default' : 'text-rb-red-default'
            )}
          >
            {pnlText}
          </div>
        </div>
      </div>

      {(hasTakeProfit || hasStopLoss) && (
        <div className="flex items-center gap-4 px-12 py-10 border-t-[0.5px] border-rabby-neutral-line">
          {hasTakeProfit && (
            <div className="text-[12px] leading-[16px] font-medium text-r-neutral-foot">
              {t('page.perpsDetail.PerpsAutoCloseModal.takeProfit')} :{' '}
              <span>${splitNumberByStep(tpPrice)}</span>
            </div>
          )}
          {hasTakeProfit && hasStopLoss && (
            <span className="text-12 text-r-neutral-foot">|</span>
          )}
          {hasStopLoss && (
            <div className="text-[12px] leading-[16px] font-medium text-r-neutral-foot">
              {t('page.perpsDetail.PerpsAutoCloseModal.stopLoss')} :{' '}
              <span>${splitNumberByStep(slPrice)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PositionItem;
