import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { splitNumberByStep } from '@/ui/utils';
import { formatPerpsCoin, formatPerpsDexName } from '../utils';

/** Only the two fields the preview reads off a scale leg. */
export interface OrderConfirmScaleOrder {
  sz: string;
  limitPx: string;
}

export interface OrderConfirmScaleTableProps {
  /** Raw coin id — may carry a HIP-3 dex prefix such as `xyz:CL`. */
  coin: string;
  /** Collateral symbol rendered after the base, e.g. `USDC`. */
  quoteAsset: string;
  isBuy: boolean;
  orders: OrderConfirmScaleOrder[];
  /**
   * Total cost, already formatted with its unit — the caller passes the same
   * string its own order summary shows, so the two can never disagree.
   */
  cost: React.ReactNode;
}

const COL_SYMBOL = 'w-[135px] shrink-0 pr-[24px]';
const COL_REST = 'flex-1 min-w-0';
const CELL_TEXT = 'text-[12px] leading-[14px]';

/**
 * The fade deliberately overflows the rail's 12px of layout (Figma 161429:98515
 * — a `w-[100px]` layer inside a `w-[12px]` box with no clipping), so the tint
 * washes across the whole Symbol column rather than stopping at the edge.
 * Painted from the `-rgb` css vars because the fade needs an alpha channel the
 * flat `rb-*` tokens can't express; the 0.2 is Figma's `opacity-20` folded into
 * the end stop.
 */
const DirectionRail: React.FC<{ isBuy: boolean }> = ({ isBuy }) => {
  const rgbVar = isBuy ? '--rb-green-default-rgb' : '--rb-red-default-rgb';

  return (
    <div className="relative w-[12px] shrink-0 self-stretch">
      <div
        className="pointer-events-none absolute top-0 bottom-0 left-0 w-[100px]"
        style={{
          background: `linear-gradient(to left, rgba(var(${rgbVar}), 0) 1.786%, rgba(var(${rgbVar}), 0.2) 107.14%)`,
        }}
      />
      <div
        className={clsx(
          'absolute top-0 bottom-0 left-0 w-[2px]',
          isBuy ? 'bg-rb-green-default' : 'bg-rb-red-default'
        )}
      />
    </div>
  );
};

/**
 * Scale's confirmation body. Passed to `OrderConfirmModal` as `children`, which
 * replaces the generic label/value section layout the other order types use.
 */
export const OrderConfirmScaleTable: React.FC<OrderConfirmScaleTableProps> = ({
  coin,
  quoteAsset,
  isBuy,
  orders,
  cost,
}) => {
  const { t } = useTranslation();

  const pairName = `${formatPerpsCoin(coin)}-${quoteAsset}`;
  const dexName = formatPerpsDexName(coin);

  return (
    <div className="px-[20px]">
      <div
        className={clsx(
          'flex items-center pb-[12px]',
          CELL_TEXT,
          'text-rb-neutral-secondary'
        )}
      >
        <div className={COL_SYMBOL}>
          {t('page.perpsPro.orderConfirm.scaleSymbol')}
        </div>
        <div className={COL_REST}>
          {t('page.perpsPro.orderConfirm.scaleOrderType')}
        </div>
        <div className={clsx(COL_REST, 'text-right')}>
          {t('page.perpsPro.orderConfirm.scaleAmount')}
        </div>
        <div className={clsx(COL_REST, 'text-right')}>
          {t('page.perpsPro.orderConfirm.scalePrice')}
        </div>
      </div>

      {/* Figma caps the list at 355px and scrolls past it. */}
      <div className="flex flex-col gap-[2px] max-h-[355px] overflow-y-auto trades-container-no-scrollbar">
        {orders.map((order, index) => (
          <div
            key={`${index}-${order.limitPx}-${order.sz}`}
            // shrink-0 is load-bearing: as a flex child of the capped column
            // the default `flex-shrink: 1` would squash every row far below
            // 44px once the list outgrows 355px, instead of scrolling.
            className="flex items-stretch h-[44px] shrink-0"
          >
            <div className={clsx('flex items-center', COL_SYMBOL)}>
              <DirectionRail isBuy={isBuy} />
              {/* `relative` so the label paints above the rail's overflowing
                  fade — a positioned sibling would otherwise tint the text. */}
              <div className="relative flex flex-col gap-[2px] min-w-0">
                <span
                  className={clsx(
                    CELL_TEXT,
                    'text-rb-neutral-title-1 truncate'
                  )}
                >
                  {pairName}
                </span>
                {dexName ? (
                  <span className="self-start px-[4px] rounded-[4px] bg-rb-neutral-bg-4 text-[10px] leading-[14px] font-medium text-rb-neutral-body">
                    {dexName}
                  </span>
                ) : null}
              </div>
            </div>
            <div
              className={clsx(
                COL_REST,
                'flex items-center',
                CELL_TEXT,
                'text-rb-neutral-body'
              )}
            >
              {t('page.perpsPro.orderConfirm.scaleLimit')}
            </div>
            <div
              className={clsx(
                COL_REST,
                'flex items-center justify-end',
                CELL_TEXT,
                'text-rb-neutral-title-1'
              )}
            >
              {splitNumberByStep(order.sz)}
            </div>
            <div
              className={clsx(
                COL_REST,
                'flex items-center justify-end',
                CELL_TEXT,
                'text-rb-neutral-title-1'
              )}
            >
              {splitNumberByStep(order.limitPx)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-[12px] py-[12px]">
        <span className="text-[13px] leading-[16px] text-rb-neutral-secondary">
          {t('page.perpsPro.orderConfirm.cost')}
        </span>
        <span className="text-[13px] leading-[16px] text-rb-neutral-title-1 text-right">
          {cost}
        </span>
      </div>
    </div>
  );
};

export default OrderConfirmScaleTable;
