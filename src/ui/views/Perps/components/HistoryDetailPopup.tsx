import React, { useMemo } from 'react';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { useTranslation } from 'react-i18next';
import { WsFill } from '@rabby-wallet/hyperliquid-sdk';
import {
  formatNumber,
  formatUsdValue,
  sinceTime,
  splitNumberByStep,
} from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { TokenImg } from './TokenImg';

interface HistoryDetailPopupProps extends Omit<PopupProps, 'onCancel'> {
  fill: (WsFill & { logoUrl: string }) | null;
  orderTpOrSl?: 'tp' | 'sl';
  onCancel: () => void;
}

export const HistoryDetailPopup: React.FC<HistoryDetailPopupProps> = ({
  visible,
  fill,
  onCancel,
  orderTpOrSl,
}) => {
  const { t } = useTranslation();
  const { coin, side, sz, px, closedPnl, time, fee, dir } = fill || {};
  const tradeValue = Number(sz) * Number(px);
  const pnlValue = Number(closedPnl) - Number(fee);
  const isClose = (dir === 'Close Long' || dir === 'Close Short') && closedPnl;
  const logoUrl = fill?.logoUrl;

  const titleString = useMemo(() => {
    const isLiquidation = Boolean(fill?.liquidation);
    if (fill?.dir === 'Close Long') {
      if (orderTpOrSl === 'tp') {
        return t('page.perps.historyDetail.title.closeLongTp');
      }
      if (orderTpOrSl === 'sl') {
        return t('page.perps.historyDetail.title.closeLongSl');
      }

      return isLiquidation
        ? t('page.perps.historyDetail.title.closeLongLiquidation')
        : t('page.perps.historyDetail.title.closeLong');
    }
    if (fill?.dir === 'Close Short') {
      if (orderTpOrSl === 'tp') {
        return t('page.perps.historyDetail.title.closeShortTp');
      }
      if (orderTpOrSl === 'sl') {
        return t('page.perps.historyDetail.title.closeShortSl');
      }

      return isLiquidation
        ? t('page.perps.historyDetail.title.closeShortLiquidation')
        : t('page.perps.historyDetail.title.closeShort');
    }
    if (fill?.dir === 'Open Long') {
      return t('page.perps.historyDetail.title.openLong');
    }
    if (fill?.dir === 'Open Short') {
      return t('page.perps.historyDetail.title.openShort');
    }
    return fill?.dir;
  }, [fill, orderTpOrSl]);

  return (
    <Popup
      placement="bottom"
      height={460}
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
        <div className="text-18 font-medium text-r-neutral-title-1 text-center pt-16 pb-12">
          {titleString}
        </div>

        {/* Content */}
        <div className="flex-1 px-20 pb-20 mt-4">
          <div className="rounded-[8px] px-16 bg-r-neutral-card-1">
            {/* Perps */}
            <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.title')}
              </span>
              <div className="flex items-center space-x-8">
                <TokenImg logoUrl={logoUrl} size={20} />
                <span className="text-13 text-r-neutral-title-1 font-medium">
                  {coin} - USD
                </span>
              </div>
            </div>

            {/* Date */}
            {time && (
              <div className="flex justify-between items-center py-16">
                <span className="text-13 text-r-neutral-body">
                  {t('page.perps.historyDetail.date')}
                </span>
                <span className="text-13 text-r-neutral-title-1 font-medium">
                  {sinceTime(time / 1000)}
                </span>
              </div>
            )}

            {Boolean(isClose) && (
              <div className="flex justify-between items-center py-16">
                <span className="text-13 text-r-neutral-body">
                  {t('page.perps.historyDetail.closedPnl')}
                </span>
                <span
                  className={`text-13 ${
                    pnlValue >= 0
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  } font-medium`}
                >
                  {pnlValue > 0 ? '+' : '-'}$
                  {splitNumberByStep(Math.abs(pnlValue).toFixed(2))}
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.price')}
              </span>
              <span className="text-13 text-r-neutral-title-1 font-medium">
                ${splitNumberByStep(px || 0)}
              </span>
            </div>

            {/* Size */}
            <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.size')}
              </span>
              <span className="text-13 text-r-neutral-title-1 font-medium">
                ${splitNumberByStep(tradeValue.toFixed(2))} = {sz} {coin}
              </span>
            </div>

            {/* Trade Value */}
            {/* <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.historyDetail.tradeValue')}
              </span>
              <span className="text-13 text-r-neutral-title-1 font-medium">
                ${splitNumberByStep(tradeValue.toFixed(2))}
              </span>
            </div> */}

            {/* Fee */}
            {fee && (
              <div className="flex justify-between items-center py-16">
                <span className="text-13 text-r-neutral-body">
                  {t('page.perps.fee')}
                </span>
                <span className="text-13 text-r-neutral-title-1 font-medium">
                  ${splitNumberByStep(Number(fee).toFixed(4))}
                </span>
              </div>
            )}

            {/* Provider */}
            <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.historyDetail.provider')}
              </span>
              <span className="text-13 text-r-neutral-title-1 font-medium">
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
