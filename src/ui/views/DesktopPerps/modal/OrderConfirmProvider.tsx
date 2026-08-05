import React from 'react';
import { useMemoizedFn } from 'ahooks';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import type { PerpsOrderConfirmType } from '@/constant/perps';
import { Z_INDEX_BASE, Z_INDEX_STEP } from '../hooks/usePerpsPopupNav';
import { OrderConfirmModal } from './OrderConfirmModal';
import type { OrderConfirmModalProps } from './OrderConfirmModal';

/**
 * Scale's confirmation is mandatory and has no persisted toggle, so it is
 * addressed by a pseudo-type that never hits the settings map.
 */
export type OrderConfirmGateType = PerpsOrderConfirmType | 'scale';

/** Everything `OrderConfirmModal` needs that the provider can't derive itself. */
export type OrderConfirmContent = Pick<
  OrderConfirmModalProps,
  'title' | 'titleSuffix' | 'sections' | 'children' | 'confirmText'
>;

export interface RequestConfirmParams {
  type: OrderConfirmGateType;
  /**
   * Built lazily at click time so callers can read the latest form state
   * without memoising a whole modal payload on every keystroke.
   */
  content: () => OrderConfirmContent;
  /** Copy for the opt-out row. Ignored when `type` is `scale`. */
  dontShowAgainText?: string;
  /**
   * Must return its promise so the dialog can show a loading state. The dialog
   * closes on both fulfilment and rejection — the submitter owns reporting its
   * own failure.
   */
  submit: () => void | Promise<unknown>;
}

interface PendingConfirm {
  type: OrderConfirmGateType;
  content: OrderConfirmContent;
  dontShowAgainText?: string;
  submit: () => void | Promise<unknown>;
}

type RequestConfirm = (params: RequestConfirmParams) => void | Promise<unknown>;

const OrderConfirmContext = React.createContext<RequestConfirm | null>(null);

/**
 * Above every popup layer: `usePerpsPopupNav` stacks its modals from
 * `Z_INDEX_BASE` upward in `Z_INDEX_STEP` increments, and this dialog opens on
 * top of whichever of them is showing. Stack depth is bounded only by how many
 * times the user nests popups (and by the `actions` query param, which is
 * hand-editable), so reserve far more headroom than the stack can reach rather
 * than sitting a few steps above it.
 */
const ORDER_CONFIRM_Z_INDEX = Z_INDEX_BASE + Z_INDEX_STEP * 100;

/**
 * Owns the single pre-submit confirmation dialog for the whole Perps page.
 *
 * It is mounted once at the root because a portalled modal still bubbles its
 * events to its React parent: rendered per call site, its keydowns and clicks
 * land on the row or panel that opened it.
 */
export const OrderConfirmProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dispatch = useRabbyDispatch();
  const orderConfirmations = useRabbySelector(
    (s) => s.perps.orderConfirmations
  );

  const [pending, setPending] = React.useState<PendingConfirm | null>(null);
  const [dontShowAgain, setDontShowAgain] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const requestConfirm = useMemoizedFn((params: RequestConfirmParams) => {
    // Scale always confirms; for the rest a missing key means "not yet
    // persisted", which reads as enabled.
    const enabled =
      params.type === 'scale' || orderConfirmations?.[params.type] !== false;

    if (!enabled) {
      // Call sites hand us `runAsync`. Most order failures never reach us:
      // `withErrorHandler` in `usePerpsProPosition` toasts them and resolves
      // with `undefined`. The rest still reject, and nothing awaits the return
      // value of an onClick handler, so swallow them here rather than leaking
      // an unhandled rejection — the submitter reports its own failure either
      // way.
      return Promise.resolve(params.submit()).catch(() => undefined);
    }

    setDontShowAgain(false);
    setPending({
      type: params.type,
      content: params.content(),
      dontShowAgainText: params.dontShowAgainText,
      submit: params.submit,
    });
  });

  const handleCancel = useMemoizedFn(() => {
    if (submitting) return;
    setPending(null);
  });

  const handleConfirm = useMemoizedFn(async () => {
    if (!pending || submitting) return;

    // Persist the opt-out before submitting: the choice is about the dialog,
    // not about whether this particular order succeeds.
    if (dontShowAgain && pending.type !== 'scale') {
      dispatch.perps.updateOrderConfirmation({
        type: pending.type,
        enabled: false,
      });
    }

    setSubmitting(true);
    try {
      await pending.submit();
    } catch (e) {
      // Swallowed on purpose: every submitter reports its own failure (toast,
      // or an inline field error on the panel behind us).
    } finally {
      // Close on rejection too: the dialog has no error surface of its own —
      // the explanation is always *behind* it, under a blurred mask the user
      // can't read or edit through.
      setPending(null);
      setSubmitting(false);
    }
  });

  return (
    <OrderConfirmContext.Provider value={requestConfirm}>
      {children}
      <OrderConfirmModal
        visible={Boolean(pending)}
        zIndex={ORDER_CONFIRM_Z_INDEX}
        title={pending?.content.title ?? ''}
        titleSuffix={pending?.content.titleSuffix}
        sections={pending?.content.sections}
        confirmText={pending?.content.confirmText}
        loading={submitting}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        dontShowAgain={
          pending && pending.type !== 'scale' && pending.dontShowAgainText
            ? {
                checked: dontShowAgain,
                onChange: setDontShowAgain,
                text: pending.dontShowAgainText,
              }
            : undefined
        }
      >
        {pending?.content.children}
      </OrderConfirmModal>
    </OrderConfirmContext.Provider>
  );
};

/**
 * Gates an order submission behind the pre-submit confirmation dialog.
 *
 * ```tsx
 * const requestConfirm = useOrderConfirm();
 * <Button onClick={() => requestConfirm({ type: 'market', content, submit })} />
 * ```
 */
export const useOrderConfirm = (): RequestConfirm => {
  const requestConfirm = React.useContext(OrderConfirmContext);
  if (!requestConfirm) {
    throw new Error('useOrderConfirm must be used inside OrderConfirmProvider');
  }
  return requestConfirm;
};
