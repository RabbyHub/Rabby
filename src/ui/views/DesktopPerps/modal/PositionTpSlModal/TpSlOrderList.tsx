import { MarketData } from '@/ui/state/perps';
import { useRabbySelector } from '@/ui/store';
import { splitNumberByStep } from '@/ui/utils';
import { RcIconPlusCC } from '@/ui/assets/desktop/common';
import { ReactComponent as RcIconPerpsTpslDelete } from '@/ui/assets/perps/IconPerpsTpslDelete.svg';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PositionFormatData } from '../../components/UserInfoHistory/PositionsInfo';
import {
  PositionTpSlOrder,
  TpSlKind,
  TpSlOrderGroups,
  TpSlScope,
  calcTpSlPnl,
  calculateTpSlCoverage,
  formatTpSlAmount,
} from '../../positionTpSl';
import {
  formatSignedValue,
  formatSizeRatio,
  getAmountUnitLabel,
} from './format';
import { TpSlSectionTitle } from './TpSlSectionTitle';

const KINDS: TpSlKind[] = ['takeProfit', 'stopLoss'];

const ACTION_BUTTON =
  'flex h-[32px] items-center gap-[6px] rounded-[6px] border-0 bg-rb-neutral-bg-5 px-[12px] text-[14px] leading-[18px] text-rb-neutral-title-1 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50';

const ROW_BUTTON =
  'h-[32px] flex-1 rounded-[6px] border-0 bg-rb-neutral-bg-2 text-[14px] leading-[18px] text-rb-neutral-title-1 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50';

interface TpSlOrderListProps {
  scope: TpSlScope;
  groups: TpSlOrderGroups;
  position: PositionFormatData;
  marketData: MarketData;
  markPrice: number;
  header?: React.ReactNode;
  busy: boolean;
  cancelingOid: number | null;
  /** `cancelingOid` value while Cancel All is in flight. */
  cancelAllKey: number;
  onAdd?: () => void;
  onAddSide?: (kind: TpSlKind) => void;
  onModify: (order: PositionTpSlOrder) => void;
  onCancel: (order: PositionTpSlOrder) => void;
  onCancelAll: () => void;
}

export const TpSlOrderList: React.FC<TpSlOrderListProps> = ({
  scope,
  groups,
  position,
  marketData,
  markPrice,
  header,
  busy,
  cancelingOid,
  cancelAllKey,
  onAdd,
  onAddSide,
  onModify,
  onCancel,
  onCancelAll,
}) => {
  const { t } = useTranslation();
  const unit = useRabbySelector((s) => s.perps.sizeDisplayUnit);
  const szDecimals = marketData.szDecimals ?? 5;
  const quoteAsset = marketData.quoteAsset || 'USDC';
  const unitLabel = getAmountUnitLabel(unit, position.coin, quoteAsset);

  const renderRow = (order: PositionTpSlOrder) => {
    const pnl = calcTpSlPnl({
      direction: position.direction,
      entryPrice: position.entryPx,
      triggerPrice: order.triggerPrice,
      size: scope === 'position' ? position.size : order.remainingSize,
    });
    const unfilled =
      scope === 'position'
        ? t('page.perpsPro.positionTpSl.all')
        : `${splitNumberByStep(
            formatTpSlAmount({
              unit,
              size: order.remainingSize,
              markPrice,
              szDecimals,
            })
          )}(${formatSizeRatio(order.remainingSize, position.size)})`;

    return (
      <div className="flex flex-col gap-[12px]">
        <div className="flex items-center gap-[4px] text-[14px] leading-[18px]">
          <span className="text-rb-neutral-foot">
            {t('page.perpsPro.positionTpSl.triggerPrice')}
          </span>
          <span
            className={
              order.kind === 'takeProfit'
                ? 'text-rb-green-default'
                : 'text-rb-red-default'
            }
          >
            {splitNumberByStep(order.triggerPrice)}
          </span>
        </div>
        <div className="flex gap-[24px] text-[12px] leading-[16px]">
          <div className="flex flex-col gap-[4px]">
            <span className="text-rb-neutral-secondary">
              {t('page.perpsPro.positionTpSl.estPnl', { unit: quoteAsset })}
            </span>
            <span
              className={clsx(
                !pnl
                  ? 'text-rb-neutral-title-1'
                  : pnl.gte(0)
                  ? 'text-rb-green-default'
                  : 'text-rb-red-default'
              )}
            >
              {pnl ? formatSignedValue(pnl) : '-'}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-[4px]">
            <span className="text-rb-neutral-secondary">
              {t('page.perpsPro.positionTpSl.price')}
            </span>
            <span className="text-rb-neutral-title-1">
              {t('page.perpsPro.positionTpSl.market')}
            </span>
          </div>
          <div className="flex flex-col items-end gap-[4px] text-right">
            <span className="text-rb-neutral-secondary">
              {t('page.perpsPro.positionTpSl.unfilledAmt', { unit: unitLabel })}
            </span>
            <span className="text-rb-neutral-title-1">{unfilled}</span>
          </div>
        </div>
        <div className="flex gap-[12px]">
          <button
            type="button"
            className={ROW_BUTTON}
            disabled={busy}
            onClick={() => onModify(order)}
          >
            {t('page.perpsPro.positionTpSl.modify')}
          </button>
          <button
            type="button"
            className={ROW_BUTTON}
            disabled={busy}
            onClick={() => onCancel(order)}
          >
            {cancelingOid === order.oid
              ? `${t('page.perpsPro.positionTpSl.cancel')}...`
              : t('page.perpsPro.positionTpSl.cancel')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-[20px] pt-[12px] pb-[12px]">
      {/* Figma 164444:144929: 12px from the tabs to the action row (top
          padding), then 24px between the action row and each group. */}
      <div className="flex flex-col gap-[24px]">
        {header}
        <div className="flex items-center gap-[12px] px-[16px]">
          {scope === 'partial' && onAdd ? (
            <button
              type="button"
              className={ACTION_BUTTON}
              disabled={busy}
              onClick={onAdd}
            >
              <RcIconPlusCC className="h-[16px] w-[16px]" />
              {t('page.perpsPro.positionTpSl.addTpSl')}
            </button>
          ) : null}
          <button
            type="button"
            className={ACTION_BUTTON}
            disabled={busy}
            onClick={onCancelAll}
          >
            <RcIconPerpsTpslDelete className="h-[16px] w-[16px]" />
            {cancelingOid === cancelAllKey
              ? `${t('page.perpsPro.positionTpSl.cancelAll')}...`
              : t('page.perpsPro.positionTpSl.cancelAll')}
          </button>
        </div>
        {KINDS.map((kind) => {
          const orders = groups[kind];
          if (scope === 'partial' && orders.length === 0) return null;
          const coverage =
            scope === 'partial'
              ? calculateTpSlCoverage(orders, position.size)
              : null;
          return (
            <section
              key={kind}
              className="flex flex-col gap-[18px] px-[16px] pb-[6px]"
            >
              <TpSlSectionTitle
                kind={kind}
                extra={
                  coverage !== null ? (
                    <span className="text-[12px] leading-[16px] text-rb-neutral-foot">
                      {t('page.perpsPro.positionTpSl.positionSizeCoverage', {
                        percent: `${coverage.toFixed(2)}%`,
                      })}
                    </span>
                  ) : null
                }
              />
              {orders.length === 0 && onAddSide ? (
                <button
                  type="button"
                  className="h-[32px] w-full rounded-[6px] border-0 bg-rb-neutral-bg-2 text-[14px] leading-[18px] font-medium text-rb-neutral-title-1 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busy}
                  onClick={() => onAddSide(kind)}
                >
                  {t('page.perpsPro.positionTpSl.add')}
                </button>
              ) : (
                orders.map((order, index) => (
                  <React.Fragment key={order.oid}>
                    {index > 0 ? (
                      <div className="h-0 border-t border-dashed border-rb-neutral-line" />
                    ) : null}
                    {renderRow(order)}
                  </React.Fragment>
                ))
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
