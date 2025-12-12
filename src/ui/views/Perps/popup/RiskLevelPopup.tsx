import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { calculateDistanceToLiquidation } from '../utils';
import Popup from '@/ui/component/Popup';
import { splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';

interface RiskLevelPopupProps {
  visible: boolean;
  pxDecimals: number;
  liquidationPrice: number;
  markPrice: number;
  onClose: () => void;
  direction: 'Long' | 'Short';
}

export const RiskLevelPopup: React.FC<RiskLevelPopupProps> = ({
  visible,
  pxDecimals,
  liquidationPrice,
  markPrice,
  onClose,
  direction,
}) => {
  const { t } = useTranslation();

  const distanceLiquidation = calculateDistanceToLiquidation(
    liquidationPrice,
    markPrice
  );

  const distancePercent = (distanceLiquidation * 100).toFixed(2);

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
      <div className="flex flex-col h-full px-[20px] pb-[32px]">
        <div
          className={clsx(
            'text-[20px] leading-[24px] font-medium text-r-neutral-title-1',
            'flex justify-center text-center items-center py-[16px]'
          )}
        >
          {t('page.perps.riskLevel.distanceLabel')}
        </div>
        <div className="bg-r-neutral-card-1 rounded-[8px]">
          <div className="text-[13px] leading-[16px]  flex items-center justify-between p-16">
            <div className="text-r-neutral-body">
              {t('page.perps.riskLevel.currentPrice')}:
            </div>
            <div className="text-r-neutral-title-1 font-medium">
              ${splitNumberByStep(markPrice.toFixed(pxDecimals))}
            </div>
          </div>
          <div className="text-[13px] leading-[16px]  flex items-center justify-between p-16">
            <div className="text-r-neutral-body">
              {t('page.perps.riskLevel.liquidationPrice')}:
            </div>
            <div className="text-r-neutral-title-1 font-medium">
              ${splitNumberByStep(liquidationPrice.toFixed(pxDecimals))}
            </div>
          </div>
          <div className={'px-[16px] pt-[8px] pb-[12px]'}>
            <div
              className={clsx(
                'bg-r-blue-light1 rounded-[6px] p-[10px]',
                'text-center text-[13px] leading-[16px] font-medium text-r-blue-default'
              )}
            >
              <Trans
                t={t}
                i18nKey={
                  direction === 'Long'
                    ? t('page.perps.riskLevel.liqDistanceTipsLong', {
                        distance: distancePercent + '%',
                      })
                    : t('page.perps.riskLevel.liqDistanceTipsShort', {
                        distance: distancePercent + '%',
                      })
                }
                components={{
                  1: <span className="font-bold" />,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default RiskLevelPopup;
