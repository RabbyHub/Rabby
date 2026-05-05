import React from 'react';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { formatUsdValue } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { AccountHistoryItem } from '@/ui/models/perps';

interface HistoryTransferDetailPopupProps extends Omit<PopupProps, 'onCancel'> {
  item: AccountHistoryItem | null;
  onCancel: () => void;
}

export const HistoryTransferDetailPopup: React.FC<HistoryTransferDetailPopupProps> = ({
  visible,
  item,
  onCancel,
}) => {
  const { t } = useTranslation();
  const isToSpot = item?.destinationDex === 'spot';
  const actionText = isToSpot
    ? t('page.perps.historyDetail.transferActionToSpot')
    : t('page.perps.historyDetail.transferActionToPerps');

  return (
    <Popup
      placement="bottom"
      height={360}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={true}
      closable
      visible={visible}
      onCancel={onCancel}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
        <div className="text-18 font-medium text-r-neutral-title-1 text-center pt-16 pb-12">
          {t('page.perps.historyDetail.transferDetailTitle')}
        </div>
        <div className="flex-1 px-20 pb-20 mt-4">
          <div className="rounded-[8px] px-16 bg-r-neutral-card-1">
            <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.historyDetail.action')}
              </span>
              <span className="text-13 text-r-neutral-title-1 font-medium">
                {actionText}
              </span>
            </div>
            <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.historyDetail.asset')}
              </span>
              <span className="text-13 text-r-neutral-title-1 font-medium">
                USDC
              </span>
            </div>
            <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.historyDetail.value')}
              </span>
              <span className="text-13 text-r-neutral-title-1 font-medium">
                {formatUsdValue(item?.usdValue || '0', BigNumber.ROUND_DOWN)}
              </span>
            </div>
            <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.historyDetail.date')}
              </span>
              <span className="text-13 text-r-neutral-title-1 font-medium">
                {item?.time ? dayjs(item.time).format('YYYY-MM-DD HH:mm') : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default HistoryTransferDetailPopup;
