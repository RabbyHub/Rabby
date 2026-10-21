import { MarketData } from '@/ui/state/perps';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { splitNumberByStep } from '@/ui/utils';
import { useMemoizedFn } from 'ahooks';
import { Button } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react';
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

/** Same floor as the trading panel's order value check. */
const MIN_ORDER_VALUE_USD = 10;

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

  // Prefill from `editingOrder` / `existingOrders` is read once on mount, so a
  // partial modify is keyed by its order's oid. The position modify form stays
  // mounted instead (to keep the user's input across a per-side Cancel) and
  // clears a side below once that side's order is gone.
  const [drafts, setDrafts] = useState<Record<TpSlKind, TpSlSideDraft>>(() => {
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
  });

  // Position modify: when a side's existing order disappears (cancelled here or
  // elsewhere), drop its prefilled trigger — otherwise it would read as a new
  // order and re-create what was just cancelled.
  const tpOid = existingOrders?.takeProfit?.oid;
  const slOid = existingOrders?.stopLoss?.oid;
  const prevOidsRef = useRef<Record<TpSlKind, number | undefined>>({
    takeProfit: tpOid,
    stopLoss: slOid,
  });
  useEffect(() => {
    const prev = prevOidsRef.current;
    prevOidsRef.current = { takeProfit: tpOid, stopLoss: slOid };
    if (mode !== 'positionModify') return;
    const gone = KINDS.filter(
      (kind) =>
        prev[kind] !== undefined &&
        (kind === 'takeProfit' ? tpOid : slOid) === undefined
    );
    if (!gone.length) return;
    setDrafts((current) => {
      const next = { ...current };
      gone.forEach((kind) => {
        next[kind] = createEmptyTpSlDraft(current[kind].mode);
      });
      return next;
    });
  }, [mode, tpOid, slOid]);

  // Amount — partial modes only. A modify opens on the slider at the order's
  // share of the position (an order for the whole position shows 100%, as in
  // Figma 164378:127241); the size stays the order's exact size until edited.
  const [amountSource, setAmountSource] = useState<'slider' | 'manual'>(
    'slider'
  );
  const [percent, setPercent] = useState(() => {
    if (!isPartialModify || !editingOrder) return 100;
    const share = new BigNumber(editingOrder.remainingSize)
      .div(position.size)
      .times(100);
    return share.isFinite()
      ? Math.min(100, Math.max(0, Math.round(share.toNumber())))
      : 100;
  });
  const [amountInput, setAmountInput] = useState('');
  // Until the amount is edited, a modify keeps the order's exact size.
  const [amountTouched, setAmountTouched] = useState(false);
  // Focus the manual input only right after the user switched from the slider.
  const [focusAmountInput, setFocusAmountInput] = useState(false);

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
    setFocusAmountInput(true);
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
    // An untouched existing order never blocks the other side.
    if (
      mode === 'positionModify' &&
      existingOrders?.[kind] &&
      isSameTriggerPrice(view.triggerPrice, existingOrders[kind]!.triggerPrice)
    ) {
      return;
    }
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
      } else if (
        !isSameTriggerPrice(view.triggerPrice, existing.triggerPrice)
      ) {
        legs.push({ ...leg, action: 'modify', oid: existing.oid });
      }
    }
  });
  const partialNotional =
    partialSize && markPrice > 0
      ? new BigNumber(partialSize).times(markPrice)
      : null;
  const belowMinOrder =
    partialNotional !== null &&
    partialNotional.gt(0) &&
    partialNotional.lt(MIN_ORDER_VALUE_USD);
  const amountValid =
    scope === 'position' || (Boolean(partialSize) && !belowMinOrder);
  const canSubmit =
    legs.length > 0 &&
    !hasInvalidSide &&
    amountValid &&
    !submitting &&
    (cancelingOid ?? null) === null;

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
      {/* Figma: 24px from the tabs (or card) to the first section; the intro
          card, when shown, sits 12px under the tabs and 24px above the form.
          No bottom padding: in the first-time frame (164431:142352) the
          container's 24px bottom padding is clipped — the content fills 638 of
          its 644px — and the footer's own 16px top padding spaces the button. */}
      <div
        className={clsx(
          'min-h-0 flex-1 overflow-y-auto px-[20px]',
          header ? 'pt-[12px]' : 'pt-[24px]'
        )}
      >
        <div className="flex flex-col gap-[24px]">
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
                source={drafts[kind].source}
                view={views[kind]}
                quoteAsset={quoteAsset}
                liquidationPriceText={liquidationPriceText}
                titleSize={titleSize}
                titleExtra={renderTitleExtra(kind)}
                disabled={submitting}
                onTriggerChange={(value) => handleTriggerChange(kind, value)}
                onModeValueChange={(value) =>
                  handleModeValueChange(kind, value)
                }
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
                errorText={
                  belowMinOrder
                    ? t('page.perpsPro.tradingPanel.minimumOrderSize')
                    : undefined
                }
                autoFocusInput={focusAmountInput}
                onBeginManual={handleBeginManual}
                onInputChange={handleAmountInputChange}
                onPercentChange={handlePercentChange}
              />
            ) : null}
            {extra}
          </div>
        </div>
      </div>
      <div className="shrink-0 px-[20px] py-[16px]">
        <Button
          block
          size="large"
          type="primary"
          className="desktop-perps-tpsl-confirm h-[48px] rounded-[6px] text-[15px] font-medium"
          disabled={!canSubmit}
          loading={submitting}
          onClick={() =>
            onSubmit({ scope, direction: position.direction, legs })
          }
        >
          {t('global.confirm')}
        </Button>
      </div>
    </div>
  );
};
