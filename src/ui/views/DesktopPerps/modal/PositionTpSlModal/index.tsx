import { MarketData } from '@/ui/state/perps';
import stats from '@/stats';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { RcIconInfoCC } from '@/ui/assets/desktop/common';
import { useMemoizedFn } from 'ahooks';
import { Modal, Tooltip } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import perpsToast from '../../components/PerpsToast';
import type { PositionFormatData } from '../../components/UserInfoHistory/PositionsInfo';
import { usePerpsProPosition } from '../../hooks/usePerpsProPosition';
import { getStatsReportSide } from '../../utils';
import {
  PositionTpSlOrder,
  TpSlCommand,
  TpSlCommandLeg,
  TpSlKind,
  TpSlScope,
  collectPositionTpSlOrders,
  groupTpSlOrders,
} from '../../positionTpSl';
import {
  PositionTpSlPositionCard,
  PositionTpSlTitleBar,
} from './PositionTpSlHeader';
import { PositionTpSlTabs } from './PositionTpSlTabs';
import { TpSlConfirmPage } from './TpSlConfirmPage';
import { TpSlForm } from './TpSlForm';
import { TpSlIntroCard } from './TpSlIntroCard';
import { TpSlOrderList } from './TpSlOrderList';

type TpSlPage = 'root' | 'add' | 'modify' | 'confirm';
type TpSlBodyPage = Exclude<TpSlPage, 'confirm'>;

/** `cancelingOid` while Cancel All is in flight (no real oid is negative). */
const CANCEL_ALL_KEY = -1;

export interface PositionTpSlModalProps {
  visible: boolean;
  position: PositionFormatData;
  marketData: MarketData;
  /** Tab to open on: the column the user clicked. */
  defaultTab: TpSlScope;
  onClose: () => void;
}

interface ContentProps extends Omit<PositionTpSlModalProps, 'visible'> {
  onBusyChange: (busy: boolean) => void;
}

const PositionTpSlContent: React.FC<ContentProps> = ({
  position,
  marketData,
  defaultTab,
  onClose,
  onBusyChange,
}) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const openOrders = useRabbySelector((s) => s.perps.openOrders);
  const orderConfirmations = useRabbySelector(
    (s) => s.perps.orderConfirmations
  );
  const tpslIntroShown = useRabbySelector((s) => s.perps.tpslIntroShown);
  const currentPerpsAccount = useRabbySelector(
    (s) => s.perps.currentPerpsAccount
  );
  const {
    handlePlacePartialTpSl,
    handleModifyPartialTpSl,
    handleSetAutoClose,
    handleModifyTpSlOrders,
    handleCancelOrder,
  } = usePerpsProPosition();

  const markPrice = Number(marketData.markPx || position.markPx || 0);
  const dex = marketData.dexId ?? '';

  const [tab, setTab] = useState<TpSlScope>(defaultTab);
  const [page, setPage] = useState<TpSlPage>('root');
  const [returnPage, setReturnPage] = useState<TpSlBodyPage>('root');
  const [editingOrder, setEditingOrder] = useState<PositionTpSlOrder>();
  const [pendingCommand, setPendingCommand] = useState<TpSlCommand | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [cancelingOid, setCancelingOid] = useState<number | null>(null);
  const inFlightRef = useRef(false);
  const [introVisible, setIntroVisible] = useState<Record<TpSlScope, boolean>>({
    partial: false,
    position: false,
  });

  const busy = submitting || cancelingOid !== null;
  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  const orders = useMemo(
    () =>
      collectPositionTpSlOrders(openOrders, {
        coin: position.coin,
        direction: position.direction,
      }),
    [openOrders, position.coin, position.direction]
  );
  const partialGroups = useMemo(
    () => groupTpSlOrders(orders, 'partial', position.direction),
    [orders, position.direction]
  );
  const positionGroups = useMemo(
    () => groupTpSlOrders(orders, 'position', position.direction),
    [orders, position.direction]
  );
  const partialOrders = [
    ...partialGroups.takeProfit,
    ...partialGroups.stopLoss,
  ];
  const positionOrders = [
    ...positionGroups.takeProfit,
    ...positionGroups.stopLoss,
  ];

  const bodyPage: TpSlBodyPage = page === 'confirm' ? returnPage : page;

  // One-time intro: the first time a tab's root renders, show the card and
  // record it right away — it never shows again, Got it or not.
  useEffect(() => {
    if (bodyPage !== 'root' || !tpslIntroShown) return;
    if (tpslIntroShown[tab] || introVisible[tab]) return;
    setIntroVisible((prev) => ({ ...prev, [tab]: true }));
    dispatch.perps.markTpslIntroShown(tab);
  }, [bodyPage, tab, tpslIntroShown]);

  const goRoot = () => {
    setPage('root');
    setEditingOrder(undefined);
    setPendingCommand(null);
  };

  const handleTabChange = (next: TpSlScope) => {
    if (busy) return;
    setTab(next);
    goRoot();
  };

  const handleBack = () => {
    if (busy) return;
    if (page === 'confirm') {
      setPage(returnPage);
      setPendingCommand(null);
      return;
    }
    goRoot();
  };

  const handleUserClose = () => {
    if (!busy) onClose();
  };

  const refreshOrders = () =>
    dispatch.perps.fetchPositionOpenOrdersHttp({ dex });

  const reportCreate = (scope: TpSlScope, leg: TpSlCommandLeg) => {
    const size = leg.size || position.size;
    const isTp = leg.kind === 'takeProfit';
    stats.report('perpsTradeHistory', {
      created_at: new Date().getTime(),
      user_addr: currentPerpsAccount?.address || '',
      trade_type:
        scope === 'partial'
          ? isTp
            ? 'partial position take profit'
            : 'partial position stop loss'
          : isTp
          ? 'position take profit'
          : 'position stop loss',
      leverage: position.leverage.toString(),
      trade_side: getStatsReportSide(position.direction === 'Short', true),
      margin_mode: position.type === 'cross' ? 'cross' : 'isolated',
      coin: position.coin,
      size,
      price: leg.triggerPrice,
      trade_usd_value: new BigNumber(leg.triggerPrice).times(size).toFixed(2),
      service_provider: 'hyperliquid',
      app_version: process.env.release || '0',
      address_type: currentPerpsAccount?.type || '',
    });
  };

  const execute = useMemoizedFn(async (command: TpSlCommand) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSubmitting(true);
    let closeAfter = false;
    try {
      if (command.scope === 'partial') {
        let succeeded = 0;
        for (const leg of command.legs) {
          if (!leg.size) continue;
          const tpsl = leg.kind === 'takeProfit' ? 'tp' : 'sl';
          const ok =
            leg.action === 'modify' && leg.oid !== undefined
              ? await handleModifyPartialTpSl({
                  coin: position.coin,
                  oid: leg.oid,
                  direction: position.direction,
                  size: leg.size,
                  triggerPx: leg.triggerPrice,
                  tpsl,
                  szDecimals: marketData.szDecimals ?? 5,
                })
              : await handlePlacePartialTpSl({
                  coin: position.coin,
                  direction: position.direction,
                  size: leg.size,
                  triggerPx: leg.triggerPrice,
                  tpsl,
                });
          if (ok) {
            succeeded += 1;
            if (leg.action === 'create') reportCreate('partial', leg);
          }
        }
        if (succeeded > 0) {
          perpsToast.success({
            title: t('page.perps.toast.success'),
            description: t('page.perpsPro.positionTpSl.submitted'),
          });
          await refreshOrders();
          goRoot();
        }
        return;
      }

      const findLeg = (kind: TpSlKind, action: TpSlCommandLeg['action']) =>
        command.legs.find((leg) => leg.kind === kind && leg.action === action);
      const tpModify = findLeg('takeProfit', 'modify');
      const slModify = findLeg('stopLoss', 'modify');
      const tpCreate = findLeg('takeProfit', 'create');
      const slCreate = findLeg('stopLoss', 'create');

      let ok = true;
      if (tpModify || slModify) {
        ok = Boolean(
          await handleModifyTpSlOrders({
            coin: position.coin,
            direction: position.direction,
            tp:
              tpModify && tpModify.oid !== undefined
                ? { oid: tpModify.oid, triggerPx: tpModify.triggerPrice }
                : undefined,
            sl:
              slModify && slModify.oid !== undefined
                ? { oid: slModify.oid, triggerPx: slModify.triggerPrice }
                : undefined,
          })
        );
      }
      if (ok && (tpCreate || slCreate)) {
        // handleSetAutoClose shows its own success toast.
        ok = Boolean(
          await handleSetAutoClose({
            coin: position.coin,
            direction: position.direction,
            tpTriggerPx: tpCreate?.triggerPrice || '',
            slTriggerPx: slCreate?.triggerPrice || '',
          })
        );
        if (ok) {
          if (tpCreate) reportCreate('position', tpCreate);
          if (slCreate) reportCreate('position', slCreate);
        }
      } else if (ok) {
        perpsToast.success({
          title: t('page.perps.toast.success'),
          description: t('page.perps.toast.setAutoCloseSuccess'),
        });
      }
      await refreshOrders();
      closeAfter = ok;
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
    if (closeAfter) onClose();
  });

  const handleFormSubmit = useMemoizedFn((command: TpSlCommand) => {
    if (orderConfirmations?.tpsl === false) {
      void execute(command);
      return;
    }
    setReturnPage(bodyPage);
    setPendingCommand(command);
    setPage('confirm');
  });

  const handleConfirm = useMemoizedFn((dontShowAgain: boolean) => {
    if (!pendingCommand) return;
    if (dontShowAgain) {
      dispatch.perps.updateOrderConfirmation({ type: 'tpsl', enabled: false });
    }
    void execute(pendingCommand);
  });

  const cancelOrders = useMemoizedFn(
    async (targets: PositionTpSlOrder[], key: number) => {
      if (inFlightRef.current || targets.length === 0) return false;
      inFlightRef.current = true;
      setCancelingOid(key);
      try {
        const ok = await handleCancelOrder(
          targets.map((order) => ({ coin: position.coin, oid: order.oid }))
        );
        if (ok) await refreshOrders();
        return Boolean(ok);
      } finally {
        inFlightRef.current = false;
        setCancelingOid(null);
      }
    }
  );

  const handleCancelExisting = useMemoizedFn(
    async (order: PositionTpSlOrder) => {
      const ok = await cancelOrders([order], order.oid);
      if (ok) goRoot();
    }
  );

  const intro = introVisible[tab] ? (
    <TpSlIntroCard
      scope={tab}
      onDismiss={() => setIntroVisible((prev) => ({ ...prev, [tab]: false }))}
    />
  ) : null;

  const positionHint = (
    <Tooltip
      overlayClassName="rectangle"
      placement="top"
      title={t('page.perpsPro.positionTpSl.introPositionDesc')}
    >
      <div className="flex w-max cursor-pointer items-center gap-[6px] text-[14px] leading-[18px] text-rb-neutral-secondary">
        <RcIconInfoCC className="h-[16px] w-[16px]" />
        {t('page.perpsPro.positionTpSl.whatIsPositionTpSl')}
      </div>
    </Tooltip>
  );

  const formCommon = {
    position,
    marketData,
    markPrice,
    submitting,
    cancelingOid,
    onSubmit: handleFormSubmit,
  };

  const renderBody = () => {
    if (tab === 'partial') {
      if (bodyPage === 'add') {
        return (
          <TpSlForm
            key="partial-add"
            mode="partialAdd"
            variant="page"
            {...formCommon}
          />
        );
      }
      if (bodyPage === 'modify' && editingOrder) {
        return (
          <TpSlForm
            key={`partial-modify-${editingOrder.oid}`}
            mode="partialModify"
            variant="page"
            editingOrder={editingOrder}
            {...formCommon}
          />
        );
      }
      if (partialOrders.length > 0) {
        return (
          <TpSlOrderList
            scope="partial"
            groups={partialGroups}
            position={position}
            marketData={marketData}
            markPrice={markPrice}
            header={intro}
            busy={busy}
            cancelingOid={cancelingOid}
            cancelAllKey={CANCEL_ALL_KEY}
            onAdd={() => setPage('add')}
            onModify={(order) => {
              setEditingOrder(order);
              setPage('modify');
            }}
            onCancel={(order) => cancelOrders([order], order.oid)}
            onCancelAll={() => cancelOrders(partialOrders, CANCEL_ALL_KEY)}
          />
        );
      }
      return (
        <TpSlForm
          key="partial-root"
          mode="partialAdd"
          variant="root"
          header={intro}
          {...formCommon}
        />
      );
    }

    const tpOrder = positionGroups.takeProfit[0];
    const slOrder = positionGroups.stopLoss[0];
    if (bodyPage === 'modify') {
      return (
        <TpSlForm
          key={`position-modify-${tpOrder?.oid ?? 'none'}-${
            slOrder?.oid ?? 'none'
          }`}
          mode="positionModify"
          variant="page"
          existingOrders={{ takeProfit: tpOrder, stopLoss: slOrder }}
          onCancelExisting={handleCancelExisting}
          {...formCommon}
        />
      );
    }
    if (positionOrders.length > 0) {
      return (
        <TpSlOrderList
          scope="position"
          groups={positionGroups}
          position={position}
          marketData={marketData}
          markPrice={markPrice}
          header={intro}
          busy={busy}
          cancelingOid={cancelingOid}
          cancelAllKey={CANCEL_ALL_KEY}
          onAddSide={() => setPage('modify')}
          onModify={() => setPage('modify')}
          onCancel={(order) => cancelOrders([order], order.oid)}
          onCancelAll={() => cancelOrders(positionOrders, CANCEL_ALL_KEY)}
        />
      );
    }
    return (
      <TpSlForm
        key="position-root"
        mode="positionCreate"
        variant="root"
        header={intro}
        extra={positionHint}
        {...formCommon}
      />
    );
  };

  const title =
    page === 'confirm'
      ? t('page.perpsPro.positionTpSl.confirmTitle')
      : page === 'add'
      ? t('page.perpsPro.positionTpSl.addTitle')
      : page === 'modify'
      ? t('page.perpsPro.positionTpSl.modifyTitle')
      : t('page.perpsPro.positionTpSl.title');

  return (
    <div className="flex h-[780px] max-h-[calc(100vh-40px)] flex-col bg-rb-neutral-bg-1">
      <PositionTpSlTitleBar
        title={title}
        onBack={page === 'root' ? undefined : handleBack}
        onClose={handleUserClose}
        disabled={busy}
      />
      <div
        className={clsx(
          'flex shrink-0 flex-col gap-[12px] px-[20px] pt-[12px]',
          page === 'confirm' && 'hidden'
        )}
      >
        <PositionTpSlPositionCard
          position={position}
          marketData={marketData}
          markPrice={markPrice}
        />
        {page === 'root' ? (
          <PositionTpSlTabs
            value={tab}
            onChange={handleTabChange}
            disabled={busy}
          />
        ) : null}
      </div>
      <div
        className={clsx(
          'flex min-h-0 flex-1 flex-col',
          page === 'confirm' && 'hidden'
        )}
      >
        {renderBody()}
      </div>
      {page === 'confirm' && pendingCommand ? (
        <TpSlConfirmPage
          command={pendingCommand}
          position={position}
          marketData={marketData}
          markPrice={markPrice}
          submitting={submitting}
          onConfirm={handleConfirm}
        />
      ) : null}
    </div>
  );
};

export const PositionTpSlModal: React.FC<PositionTpSlModalProps> = ({
  visible,
  onClose,
  ...rest
}) => {
  const [busy, setBusy] = useState(false);
  // Mask click / Esc must not close mid-submit; programmatic closes from the
  // content (after a successful submit) go straight to `onClose`.
  const handleMaskClose = useMemoizedFn(() => {
    if (!busy) onClose();
  });

  return (
    <Modal
      visible={visible}
      onCancel={handleMaskClose}
      footer={null}
      closable={false}
      centered
      destroyOnClose
      width={480}
      bodyStyle={{ padding: 0, maxHeight: 'unset' }}
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      className="modal-support-darkmode desktop-perps-modal-surface"
    >
      <PositionTpSlContent {...rest} onClose={onClose} onBusyChange={setBusy} />
    </Modal>
  );
};

export default PositionTpSlModal;
