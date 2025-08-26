import React from 'react';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { useTranslation } from 'react-i18next';
import { WsFill } from '@rabby-wallet/hyperliquid-sdk';
import { formatNumber, formatUsdValue, sinceTime } from '@/ui/utils';
import BigNumber from 'bignumber.js';

interface HistoryDetailPopupProps extends Omit<PopupProps, 'onCancel'> {
  fill: (WsFill & { logoUrl: string }) | null;
  onCancel: () => void;
}

export const HistoryDetailPopup: React.FC<HistoryDetailPopupProps> = ({
  visible,
  fill,
  onCancel,
}) => {
  const { t } = useTranslation();
  if (!fill) return null;
  const { coin, side, sz, px, closedPnl, time, fee } = fill || {};
  const tradeValue = Number(sz) * Number(px);
  const logoUrl = fill?.logoUrl;
  return (
    <Popup
      placement="bottom"
      height={480}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={true}
      closable
      visible={visible}
      onCancel={onCancel}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
        {/* Header */}
        <div className="text-18 font-medium text-r-neutral-title-1 text-center pt-16 pb-16">
          {fill.dir}
        </div>

        {/* Content */}
        <div className="flex-1 px-20 pb-20 mt-8">
          <div className="rounded-[8px] px-16 bg-r-neutral-card-1">
            {/* Perps */}
            <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.title')}
              </span>
              <div className="flex items-center space-x-8">
                <img src={logoUrl} className="w-20 h-20 rounded-full" />
                <span className="text-13 text-r-neutral-title-1 font-medium">
                  {coin} - USD
                </span>
              </div>
            </div>

            {/* Date */}
            <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.historyDetail.date')}
              </span>
              <span className="text-13 text-r-neutral-title-1 font-medium">
                {sinceTime(time / 1000)}
              </span>
            </div>

            {/* Price */}
            <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.price')}
              </span>
              <span className="text-13 text-r-neutral-title-1 font-medium">
                ${px}
              </span>
            </div>

            {/* Size */}
            <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.size')}
              </span>
              <span className="text-13 text-r-neutral-title-1 font-medium">
                {sz} {coin}
              </span>
            </div>

            {/* Trade Value */}
            <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.historyDetail.tradeValue')}
              </span>
              <span className="text-13 text-r-neutral-title-1 font-medium">
                {formatUsdValue(tradeValue, BigNumber.ROUND_DOWN)}
              </span>
            </div>

            {/* Fee */}
            {fee && (
              <div className="flex justify-between items-center py-16">
                <span className="text-13 text-r-neutral-body">
                  {t('page.perps.fee')}
                </span>
                <span className="text-13 text-r-neutral-title-1 font-medium">
                  ${formatNumber(Number(fee), 4)}
                </span>
              </div>
            )}

            {/* Provider */}
            <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.historyDetail.provider')}
              </span>
              <span className="text-13 text-blue-500 font-medium">
                Hyperliquid
              </span>
            </div>
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default HistoryDetailPopup;
