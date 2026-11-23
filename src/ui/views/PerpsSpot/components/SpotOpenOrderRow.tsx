import React from 'react';
import clsx from 'clsx';
import { Button } from 'antd';
import type { OpenOrder } from '@rabby-wallet/hyperliquid-sdk';
import { useTranslation } from 'react-i18next';
import {
  getSpotOrderDistanceFromMid,
  getSpotOrderFillPct,
} from '../utils/spotMarkets';
import type { SpotMarket } from '../utils/spotMarkets';
import { formatSpotPctChange } from './format';

export const SpotOpenOrderRow: React.FC<{
  order: OpenOrder;
  market: SpotMarket;
  cancelling: boolean;
  cancelDisabled: boolean;
  onCancel: (pairIndex: number, oid: number) => void;
}> = ({ order, market, cancelling, cancelDisabled, onCancel }) => {
  const { t } = useTranslation();
  const isBuy = order.side === 'B';
  const fillPct = getSpotOrderFillPct(order);
  const distance = getSpotOrderDistanceFromMid(order, market.midPx);
  const filled = Math.max(Number(order.origSz) - Number(order.sz), 0);

  return (
    <div className="flex items-stretch gap-10 px-12 py-12 rounded-[8px] bg-r-neutral-card1">
      <div
        className={clsx(
          'w-[3px] rounded-full',
          isBuy ? 'bg-r-green-default' : 'bg-r-red-default'
        )}
      />
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        <div className="flex items-center gap-6 text-13 font-medium text-r-neutral-title-1">
          <span
            className={isBuy ? 'text-r-green-default' : 'text-r-red-default'}
          >
            {t(isBuy ? 'page.perpsSpot.buyOrder' : 'page.perpsSpot.sellOrder', {
              size: order.origSz,
              base: market.baseName,
            })}
          </span>
          <span className="text-r-neutral-foot">@ {order.limitPx}</span>
        </div>
        <div className="h-[4px] rounded-full bg-r-neutral-card2 overflow-hidden">
          <div
            className={
              isBuy ? 'h-full bg-r-green-default' : 'h-full bg-r-red-default'
            }
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <div className="text-12 text-r-neutral-foot">
          {t('page.perpsSpot.filledProgress', {
            filled: filled.toString(),
            total: order.origSz,
          })}
          {distance !== null
            ? ` · ${t('page.perpsSpot.fromMid', {
                pct: formatSpotPctChange(distance),
              })}`
            : ''}
        </div>
      </div>
      <Button
        size="small"
        className="self-center"
        loading={cancelling}
        disabled={cancelDisabled && !cancelling}
        onClick={() => onCancel(market.pairIndex, order.oid)}
      >
        {t('page.perpsSpot.cancel')}
      </Button>
    </div>
  );
};
