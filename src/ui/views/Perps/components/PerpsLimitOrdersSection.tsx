import React, { useState } from 'react';
import clsx from 'clsx';
import { Button, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMemoizedFn } from 'ahooks';
import { MarketData } from '@/ui/models/perps';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { PerpsBlueBorderedButton } from './BlueBorderedButton';
import { PerpsLimitOrderItem } from './PerpsLimitOrderItem';
import { LimitOrderDetailPopup } from '../popup/LimitOrderDetailPopup';
import { usePerpsPosition } from '../hooks/usePerpsPosition';
import { LimitOrderRow } from '../hooks/useLimitOrders';

export const PerpsLimitOrdersSection: React.FC<{
  rows: LimitOrderRow[];
  marketDataMap: Record<string, MarketData>;
  /** 外层容器 className，由调用页传入边距（首页 mt-20 mx-20 / 详情页 mt-16）。 */
  className?: string;
}> = ({ rows, marketDataMap, className }) => {
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();
  const {
    handleCancelLimitOrders,
    handleActionApproveStatus,
  } = usePerpsPosition();
  const [activeRow, setActiveRow] = useState<LimitOrderRow | null>(null);

  const handleCancelAll = useMemoizedFn(() => {
    const modal = Modal.info({
      width: 360,
      closable: false,
      maskClosable: true,
      centered: true,
      title: null,
      className: clsx(
        'perps-bridge-swap-modal perps-close-all-position-modal',
        isDarkTheme
          ? 'perps-bridge-swap-modal-dark'
          : 'perps-bridge-swap-modal-light'
      ),
      bodyStyle: { padding: 0 },
      content: (
        <div
          className={clsx(
            'flex items-center justify-center flex-col gap-12',
            'bg-r-neutral-bg2 rounded-lg',
            'px-[16px] pt-[20px] pb-[24px]'
          )}
        >
          <div className="text-[17px] font-bold text-r-neutral-title-1 text-center">
            {t('page.perps.cancelAllOrdersPopup.cancelAllOrdersConfirmTitle')}
          </div>
          <div className="text-15 font-medium text-r-neutral-title-1 text-center">
            {t('page.perps.cancelAllOrdersPopup.cancelAllOrdersConfirmMessage')}
          </div>
          <div className="flex items-center justify-center w-full gap-12 mt-20">
            <PerpsBlueBorderedButton block onClick={() => modal.destroy()}>
              {t('page.manageAddress.cancel')}
            </PerpsBlueBorderedButton>
            <Button
              size="large"
              block
              type="primary"
              onClick={async () => {
                modal.destroy();
                await handleActionApproveStatus();
                await handleCancelLimitOrders(rows.map((r) => r.order));
              }}
            >
              {t('page.manageAddress.confirm')}
            </Button>
          </div>
        </div>
      ),
    });
  });

  const handleCancelSingle = useMemoizedFn(
    async (rowToCancel: LimitOrderRow) => {
      await handleActionApproveStatus();
      const ok = await handleCancelLimitOrders([rowToCancel.order]);
      if (ok) setActiveRow(null);
    }
  );

  if (!rows.length) return null;

  return (
    <div className={className}>
      <div className="flex items-center mb-8 justify-between">
        <div className="text-15 font-semibold text-r-neutral-title-1 flex items-center gap-6">
          <span className="w-[2px] h-[12px] bg-r-blue-default inline-block" />
          {t('page.perps.limitOrders')}
        </div>
        <div
          className="text-13 font-medium text-r-neutral-foot hover:text-rb-brand-default cursor-pointer"
          onClick={handleCancelAll}
        >
          {t('page.perps.cancelAll')}
        </div>
      </div>
      <div className="flex flex-col gap-8">
        {rows.map((row) => (
          <PerpsLimitOrderItem
            key={row.order.oid}
            order={row.order}
            leverage={row.leverage}
            marginUsage={row.marginUsage}
            marketData={marketDataMap[row.order.coin]}
            onClick={() => setActiveRow(row)}
          />
        ))}
      </div>
      <LimitOrderDetailPopup
        visible={!!activeRow}
        row={activeRow}
        marketData={activeRow ? marketDataMap[activeRow.order.coin] : undefined}
        onClose={() => setActiveRow(null)}
        onCancel={() => {
          if (activeRow) return handleCancelSingle(activeRow);
        }}
      />
    </div>
  );
};

export default PerpsLimitOrdersSection;
