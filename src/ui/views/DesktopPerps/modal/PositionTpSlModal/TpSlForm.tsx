import { MarketData } from '@/ui/state/perps';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { splitNumberByStep } from '@/ui/utils';
import { useMemoizedFn } from 'ahooks';
import { Button } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validatePriceInput } from '../../../Perps/pricePrecision';
import type { PositionFormatData } from '../../components/UserInfoHistory/PositionsInfo';
import {
  PositionTpSlOrder,
  TpSlCalcContext,
  TpSlCommand,
  TpSlCommandLeg,
  TpSlInputMode,
  TpSlKind,
  TpSlScope,
  TpSlSideDraft,
  createEmptyTpSlDraft,
  formatTpSlAmount,
  getTpSlMaxAmountInput,
  isSameTriggerPrice,
  normalizeTriggerPrice,
  resolvePartialTpSlSize,
  resolveTpSlSideView,
} from '../../positionTpSl';
import { getAmountUnitLabel } from './format';
import { TpSlAmountInput } from './TpSlAmountInput';
import { TpSlSideInputs } from './TpSlSideInputs';

export type TpSlFormMode =
  | 'partialAdd'
  | 'partialModify'
  | 'positionCreate'
  | 'positionModify';

interface TpSlFormProps {
  mode: TpSlFormMode;
  /** `root`: under the tabs (inset 16px, 14px titles). `page`: a sub-page. */
  variant: 'root' | 'page';
  position: PositionFormatData;
  marketData: MarketData;
  markPrice: number;
  /** partialModify: the order being edited. */
  editingOrder?: PositionTpSlOrder;
  /** positionModify: the current position-scope order of each side. */
  existingOrders?: Partial<Record<TpSlKind, PositionTpSlOrder>>;
  submitting: boolean;
  cancelingOid?: number | null;
  /** Above the inputs (the one-time intro card). */
  header?: React.ReactNode;
  /** Below the inputs (the Position tab's hover hint). */
  extra?: React.ReactNode;
  onSubmit: (command: TpSlCommand) => void;
  onCancelExisting?: (order: PositionTpSlOrder) => void;
}

const KINDS: TpSlKind[] = ['takeProfit', 'stopLoss'];

const stripDecorations = (value: string) =>
  value.replace(/,/g, '').replace(/[$%\s+-]/g, '');

export const TpSlForm: React.FC<TpSlFormProps> = ({
  mode,
  variant,
  position,
  marketData,
  markPrice,
  editingOrder,
  existingOrders,
  submitting,
  cancelingOid,
  header,
  extra,
  onSubmit,
  onCancelExisting,
}) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const tpslModePreferences = useRabbySelector(
    (s) => s.perps.tpslModePreferences
  );
  const unit = useRabbySelector((s) => s.perps.sizeDisplayUnit);

  const scope: TpSlScope =
    mode === 'partialAdd' || mode === 'partialModify' ? 'partial' : 'position';
  const isPartialModify = mode === 'partialModify';
  const szDecimals = marketData.szDecimals ?? 5;
  const pxDecimals = marketData.pxDecimals ?? 2;
  const quoteAsset = marketData.quoteAsset || 'USDC';
  const unitLabel = getAmountUnitLabel(unit, position.coin, quoteAsset);
  const visibleKinds: TpSlKind[] =
    isPartialModify && editingOrder ? [editingOrder.kind] : KINDS;
  const liquidationPriceText =
    Number(position.liquidationPx) > 0
      ? `$${splitNumberByStep(
          new BigNumber(position.liquidationPx).toFixed(pxDecimals)
        )}`
      : '';

  // Prefill from `editingOrder` / `existingOrders` is read once on mount.
  // Callers must key the form by the identity of those orders (e.g. their oids)
  // so it remounts when they change.
  const [drafts, setDrafts] = useState<Record<TpSlKind, TpSlSideDraft>>(
    () => {
      const build = (kind: TpSlKind): TpSlSideDraft => {
        const preference =
          kind === 'takeProfit' ? tpslModePreferences.tp : tpslModePreferences.sl;
        const draft = createEmptyTpSlDraft(preference === 'roi' ? 'roi' : 'pnl');
        const order = isPartialModify
          ? editingOrder?.kind === kind
            ? editingOrder
            : undefined
          : mode === 'positionModify'
          ? existingOrders?.[kind]
          : undefined;
        return order
          ? {
              ...draft,
              triggerPrice: normalizeTriggerPrice(order.triggerPrice, szDecimals),
            }
          : draft;
      };
      return { takeProfit: build('takeProfit'), stopLoss: build('stopLoss') };
    }
  );

  // Amount — partial modes only.
  const [amountSource, setAmountSource] = useState<'slider' | 'manual'>(
    isPartialModify ? 'manual' : 'slider'
  );
  const [percent, setPercent] = useState(isPartialModify ? 0 : 100);
  const [amountInput, setAmountInput] = useState(() =>
    isPartialModify && editingOrder
      ? formatTpSlAmount({
          unit,
          size: editingOrder.remainingSize,
          markPrice,
          szDecimals,
        })
      : ''
  );
  // Until the amount is edited, a modify keeps the order's exact size.
  const [amountTouched, setAmountTouched] = useState(false);

  const maxAmountInput = getTpSlMaxAmountInput({
    unit,
    positionSize: position.size,
    markPrice,
    szDecimals,
  });
  const partialSize =
    scope !== 'partial'
      ? null
      : isPartialModify && editingOrder && !amountTouched
      ? editingOrder.remainingSize
      : resolvePartialTpSlSize({
          source: amountSource,
          percent,
          amountInput,
          unit,
          positionSize: position.size,
          markPrice,
          szDecimals,
        });

  const ctx: TpSlCalcContext = {
    scope,
    direction: position.direction,
    entryPrice: position.entryPx,
    leverage: position.leverage,
    size: scope === 'partial' ? partialSize ?? '' : position.size,
    szDecimals,
    markPrice,
    liquidationPrice: position.liquidationPx,
  };
  const views = {
    takeProfit: resolveTpSlSideView(drafts.takeProfit, 'takeProfit', ctx),
    stopLoss: resolveTpSlSideView(drafts.stopLoss, 'stopLoss', ctx),
  };

  const updateDraft = (kind: TpSlKind, patch: Partial<TpSlSideDraft>) =>
    setDrafts((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }));

  const handleTriggerChange = useMemoizedFn((kind: TpSlKind, value: string) => {
    const next = stripDecorations(value);
    if (!validatePriceInput(next, szDecimals)) return;
    updateDraft(kind, { source: 'trigger', triggerPrice: next, modeValue: '' });
  });

  const handleModeValueChange = useMemoizedFn(
    (kind: TpSlKind, value: string) => {
      const next = stripDecorations(value);
      if (!/^\d*\.?\d{0,2}$/.test(next)) return;
      updateDraft(kind, { source: 'mode', modeValue: next, triggerPrice: '' });
    }
  );

  const handleModeChange = useMemoizedFn(
    (kind: TpSlKind, nextMode: TpSlInputMode) => {
      dispatch.perps.updateTpslModePreference({
        side: kind === 'takeProfit' ? 'tp' : 'sl',
        mode: nextMode,
      });
      // Keep the effective trigger; the magnitude re-derives in the new unit.
      updateDraft(kind, {
        mode: nextMode,
        source: 'trigger',
        triggerPrice: views[kind].triggerPrice,
        modeValue: '',
      });
    }
  );

  const handleBeginManual = useMemoizedFn(() => {
    if (amountSource === 'manual') return;
    setAmountSource('manual');
    setPercent(0);
    setAmountInput('');
    setAmountTouched(true);
  });

  const handleAmountInputChange = useMemoizedFn((value: string) => {
    const next = value.replace(/,/g, '');
    const decimals = unit === 'usd' ? 2 : szDecimals;
    const pattern =
      decimals > 0 ? new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`) : /^\d*$/;
    if (!pattern.test(next)) return;
    setAmountTouched(true);
    setAmountInput(
      next && new BigNumber(next).gt(maxAmountInput) ? maxAmountInput : next
    );
  });

  const handlePercentChange = useMemoizedFn((value: number) => {
    setAmountSource('slider');
    setPercent(Math.round(value));
    setAmountTouched(true);
  });

  // What Confirm would submit (spec §8.5).
  const legs: TpSlCommandLeg[] = [];
  let hasInvalidSide = false;
  visibleKinds.forEach((kind) => {
    const view = views[kind];
    if (view.status === 'invalid') {
      hasInvalidSide = true;
      return;
    }
    if (view.status !== 'valid') return;
    const leg = {
      kind,
      triggerPrice: view.triggerPrice,
      pnl: view.pnl,
      size: scope === 'partial' ? partialSize : null,
    };
    if (mode === 'partialAdd' || mode === 'positionCreate') {
      legs.push({ ...leg, action: 'create' });
      return;
    }
    if (mode === 'partialModify' && editingOrder) {
      const sizeChanged =
        partialSize !== null &&
        !new BigNumber(partialSize).eq(editingOrder.remainingSize);
      if (
        sizeChanged ||
        !isSameTriggerPrice(view.triggerPrice, editingOrder.triggerPrice)
      ) {
        legs.push({ ...leg, action: 'modify', oid: editingOrder.oid });
      }
      return;
    }
    if (mode === 'positionModify') {
      const existing = existingOrders?.[kind];
      if (!existing) {
        legs.push({ ...leg, action: 'create' });
      } else if (!isSameTriggerPrice(view.triggerPrice, existing.triggerPrice)) {
        legs.push({ ...leg, action: 'modify', oid: existing.oid });
      }
    }
  });
  const amountValid = scope === 'position' || Boolean(partialSize);
  const canSubmit =
    legs.length > 0 && !hasInvalidSide && amountValid && !submitting;

  const renderTitleExtra = (kind: TpSlKind) => {
    if (mode !== 'positionModify' || !onCancelExisting) return null;
    const existing = existingOrders?.[kind];
    if (!existing) return null;
    return (
      <button
        type="button"
        disabled={submitting || (cancelingOid ?? null) !== null}
        onClick={() => onCancelExisting(existing)}
        className="border-0 bg-transparent p-0 text-[14px] leading-[18px] font-medium text-rb-neutral-title-1 hover:text-rb-brand-default disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cancelingOid === existing.oid
          ? `${t('page.perpsPro.positionTpSl.cancel')}...`
          : t('page.perpsPro.positionTpSl.cancel')}
      </button>
    );
  };

  const titleSize = variant === 'page' ? 'large' : 'default';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-[20px] pt-[12px] pb-[24px]">
        <div className="flex flex-col gap-[12px]">
          {header}
          <div
            className={clsx(
              'flex flex-col gap-[24px]',
              variant === 'root' && 'px-[16px]'
            )}
          >
            {visibleKinds.map((kind) => (
              <TpSlSideInputs
                key={kind}
                kind={kind}
                mode={drafts[kind].mode}
                view={views[kind]}
                quoteAsset={quoteAsset}
                liquidationPriceText={liquidationPriceText}
                titleSize={titleSize}
                titleExtra={renderTitleExtra(kind)}
                disabled={submitting}
                onTriggerChange={(value) => handleTriggerChange(kind, value)}
                onModeValueChange={(value) => handleModeValueChange(kind, value)}
                onModeChange={(next) => handleModeChange(kind, next)}
              />
            ))}
            {scope === 'partial' ? (
              <TpSlAmountInput
                source={amountSource}
                percent={percent}
                sliderAmountText={splitNumberByStep(
                  formatTpSlAmount({
                    unit,
                    size: partialSize || '0',
                    markPrice,
                    szDecimals,
                  })
                )}
                inputValue={amountInput}
                unitLabel={unitLabel}
                positionAmountText={splitNumberByStep(
                  formatTpSlAmount({
                    unit,
                    size: position.size,
                    markPrice,
                    szDecimals,
                  })
                )}
                titleSize={titleSize}
                disabled={submitting}
                hasError={
                  amountTouched &&
                  amountSource === 'manual' &&
                  amountInput !== '' &&
                  !partialSize
                }
                onBeginManual={handleBeginManual}
                onInputChange={handleAmountInputChange}
                onPercentChange={handlePercentChange}
              />
            ) : null}
            {extra}
          </div>
        </div>
      </div>
      <div
        className={clsx(
          'shrink-0 px-[20px] py-[16px]',
          variant === 'root' &&
            'border-t-[0.5px] border-solid border-rb-neutral-line'
        )}
      >
        <Button
          block
          size="large"
          type="primary"
          className="desktop-perps-tpsl-confirm h-[48px] rounded-[6px] text-[15px] font-medium"
          disabled={!canSubmit}
          loading={submitting}
          onClick={() => onSubmit({ scope, legs })}
        >
          {t('global.confirm')}
        </Button>
      </div>
    </div>
  );
};
