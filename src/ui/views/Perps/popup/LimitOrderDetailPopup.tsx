import React from 'react';
import dayjs from 'dayjs';
import BigNumber from 'bignumber.js';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import Popup from '@/ui/component/Popup';
import { splitNumberByStep } from '@/ui/utils';
import { MarketData } from '@/ui/models/perps';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { formatPerpsCoin } from '../../DesktopPerps/utils';
import { computeFilledPct } from '../limitOrderUtils';
import { LimitOrderRow } from '../hooks/useLimitOrders';

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex items-center justify-between py-16 text-13 leading-[16px]">
    <span className="text-r-neutral-body">{label}</span>
    <span className="text-r-neutral-title-1 font-medium">{value}</span>
  </div>
);

export const LimitOrderDetailPopup: React.FC<{
  visible: boolean;
  row: LimitOrderRow | null;
  marketData?: MarketData;
  onClose: () => void;
  onCancel: () => Promise<void> | void;
}> = ({ visible, row, marketData, onClose, onCancel }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(false);

  let body: React.ReactNode = null;
  if (row) {
    const { order, marginUsage } = row;
    const isBuy = order.side === 'B';
    const base = formatPerpsCoin(
      marketData?.displayName || marketData?.name || order.coin
    );
    const quote = marketData?.quoteAsset || 'USDC';
    const notional = new BigNumber(order.limitPx || 0).times(order.origSz || 0);
    const filledPct = computeFilledPct(String(order.origSz), order.sz);

    body = (
      <div className="flex flex-col px-[20px] pb-[24px]">
        <div className="text-[18px] leading-[22px] font-medium text-r-neutral-title-1 text-center py-[16px]">
          {t('page.perps.limitOrderDetail.title', {
            side: isBuy
              ? t('page.perps.limitOrderDetail.buy')
              : t('page.perps.limitOrderDetail.sell'),
            pair: `${base}/${quote}`,
          })}
        </div>
        <div className="bg-r-neutral-card1 rounded-[8px] px-16">
          <DetailRow
            label={t('page.perps.limitOrderDetail.time')}
            value={dayjs(order.timestamp).format('YYYY-MM-DD HH:mm')}
          />
          <DetailRow
            label={t('page.perps.limitOrderDetail.size')}
            value={`${splitNumberByStep(notional.toFixed(2))} ${quote} = ${
              order.origSz
            } ${base}`}
          />
          <DetailRow
            label={t('page.perps.limitOrderDetail.filled')}
            value={`${filledPct.toFixed(0)}%`}
          />
          <DetailRow
            label={t('page.perps.limitOrderDetail.limitPrice')}
            value={`@ $${splitNumberByStep(order.limitPx)}`}
          />
          <DetailRow
            label={t('page.perps.limitOrderDetail.marginUsage')}
            value={`${splitNumberByStep(
              new BigNumber(marginUsage).toFixed(2)
            )} ${quote}`}
          />
        </div>
        <Button
          type="primary"
          block
          size="large"
          loading={loading}
          className="mt-20 h-[48px] text-15 font-medium rounded-[8px]"
          onClick={async () => {
            setLoading(true);
            try {
              await onCancel();
            } finally {
              setLoading(false);
            }
          }}
        >
          {t('page.perps.limitOrderDetail.cancelLimitOrder')}
        </Button>
      </div>
    );
  }

  return (
    <Popup
      closable
      placement="bottom"
      visible={visible}
      onCancel={onClose}
      height={'fit-content'}
      bodyStyle={{
        padding: 0,
        background: 'var(--r-neutral-bg2, #F2F4F7)',
        borderRadius: '16px 16px 0 0',
      }}
      closeIcon={
        <RcIconCloseCC className="w-[20px] h-[20px] text-r-neutral-body mt-[-2px]" />
      }
      destroyOnClose
      isSupportDarkMode
    >
      {body}
    </Popup>
  );
};

export default LimitOrderDetailPopup;
