import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { OpenOrder, Leverage } from '@rabby-wallet/hyperliquid-sdk';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { MarketData } from '@/ui/models/perps';
import { TokenImg } from './TokenImg';
import { PerpsDisplayCoinName } from './PerpsDisplayCoinName';
import { computeFilledPct } from '../limitOrderUtils';

/** 12 点钟方向起画的圆形成交进度环。 */
const FilledProgressIcon: React.FC<{ percent: number; size?: number }> = ({
  percent,
  size = 14,
}) => {
  const r = (size - 2) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = c * (1 - clamped / 100);
  const center = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="var(--r-neutral-line, #e0e5ec)"
        strokeWidth={2}
      />
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="var(--r-blue-default, #7084ff)"
        strokeWidth={2}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
      />
    </svg>
  );
};

export const PerpsLimitOrderItem: React.FC<{
  order: OpenOrder;
  leverage: Leverage | null;
  marginUsage: number;
  marketData?: MarketData;
  onClick: () => void;
  /** 点击币对名时触发（用于跳转到 SingleCoin）。未传则币对名无独立点击。 */
  onCoinClick?: () => void;
}> = ({ order, leverage, marginUsage, marketData, onClick, onCoinClick }) => {
  const { t } = useTranslation();
  const isBuy = order.side === 'B';
  const side = isBuy ? 'Long' : 'Short';
  const filledPct = computeFilledPct(String(order.origSz), order.sz);
  const marginType = leverage?.type;

  return (
    <div
      className={clsx(
        'w-full bg-r-neutral-card1 rounded-[8px] flex items-center justify-between',
        'px-16 py-12 cursor-pointer',
        'border-[1px] border-solid border-transparent',
        'hover:bg-r-blue-light1 hover:border-rabby-blue-default'
      )}
      onClick={onClick}
    >
      <div className="flex flex-col gap-8 flex-1 min-w-0">
        <div className="flex items-center">
          <TokenImg
            logoUrl={marketData?.logoUrl || ''}
            direction={side}
            withDirection={false}
            size={20}
          />
          <span
            className={clsx(
              'text-15 ml-4 font-medium',
              isBuy ? 'text-r-green-default' : 'text-r-red-default'
            )}
          >
            {isBuy
              ? t('page.perps.limitOrderDetail.buy')
              : t('page.perps.limitOrderDetail.sell')}
          </span>
          {onCoinClick ? (
            <span
              className="group cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onCoinClick();
              }}
            >
              <PerpsDisplayCoinName
                item={marketData}
                className="text-15 ml-4 font-medium"
                baseClassName="group-hover:text-r-blue-default"
                quoteClassName="group-hover:text-r-blue-default"
              />
            </span>
          ) : (
            <PerpsDisplayCoinName
              item={marketData}
              className="text-15 ml-4 font-medium"
            />
          )}
        </div>
        <div className="flex items-center gap-6">
          <span
            className={clsx(
              'text-[12px] font-medium px-4 h-[18px] flex items-center justify-center rounded-[4px]',
              isBuy
                ? 'text-r-green-default bg-r-green-light'
                : 'text-r-red-default bg-r-red-light'
            )}
          >
            {side} {leverage?.value ?? '--'}x
          </span>
          {marginType && (
            <span className="text-[12px] font-medium px-4 h-[18px] flex items-center justify-center rounded-[4px] bg-r-neutral-card2 text-r-neutral-foot">
              {marginType === 'cross'
                ? t('page.perps.cross')
                : t('page.perps.isolated')}
            </span>
          )}
          <span className="text-[12px] font-medium text-r-neutral-foot">
            @${splitNumberByStep(order.limitPx)}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-4 ml-8">
        <div className="text-15 font-medium text-r-neutral-title-1">
          {formatUsdValue(marginUsage)}
        </div>
        <div className="flex items-center gap-4 text-13 font-medium text-r-neutral-foot">
          <span>
            {t('page.perps.limitOrderDetail.filled')} {filledPct.toFixed(0)}%
          </span>
          <FilledProgressIcon percent={filledPct} />
        </div>
      </div>
    </div>
  );
};

export default PerpsLimitOrderItem;
