import React from 'react';
import { Button, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { PERPS_POSITION_RISK_LEVEL } from '../constants';
import { getRiskLevel, calculateDistanceToLiquidation } from '../utils';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';

import { ReactComponent as ImgDanger } from 'ui/assets/perps/img-danger.svg';
import { ReactComponent as ImgWarning } from 'ui/assets/perps/img-warning.svg';
import { ReactComponent as ImgSafe } from 'ui/assets/perps/img-safe.svg';
import Popup from '@/ui/component/Popup';
import { splitNumberByStep } from '@/ui/utils';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import clsx from 'clsx';

const StyledModal = styled(Modal)`
  .ant-modal-content {
    background-color: var(--r-neutral-card1, #fff);
    border-radius: 16px;
  }
  .ant-modal-header {
    display: none;
  }
  .ant-modal-body {
    padding: 32px 20px;
    text-align: center;
  }
  .ant-modal-footer {
    border-top: none;
    padding: 0 20px 32px;
  }
`;

interface RiskLevelPopupProps {
  visible: boolean;
  pxDecimals: number;
  liquidationPrice: number;
  markPrice: number;
  onClose: () => void;
}

export const RiskLevelPopup: React.FC<RiskLevelPopupProps> = ({
  visible,
  pxDecimals,
  liquidationPrice,
  markPrice,
  onClose,
}) => {
  const { t } = useTranslation();

  const distanceLiquidation = calculateDistanceToLiquidation(
    liquidationPrice,
    markPrice
  );

  const riskLevel = getRiskLevel(distanceLiquidation);

  const distancePercent = (distanceLiquidation * 100).toFixed(2);

  const riskConfig = React.useMemo(() => {
    const configs = {
      [PERPS_POSITION_RISK_LEVEL.DANGER]: {
        Icon: ImgDanger,
        title: t('page.perps.riskLevel.danger.title'),
        description: t('page.perps.riskLevel.danger.description'),
        color: 'text-rb-red-default',
        bgColor: 'bg-rb-red-light-1',
      },
      [PERPS_POSITION_RISK_LEVEL.WARNING]: {
        Icon: ImgWarning,
        title: t('page.perps.riskLevel.warning.title'),
        description: t('page.perps.riskLevel.warning.description'),
        color: 'text-rb-orange-default',
        bgColor: 'bg-rb-orange-light-4',
      },
      [PERPS_POSITION_RISK_LEVEL.SAFE]: {
        Icon: ImgSafe,
        title: t('page.perps.riskLevel.safe.title'),
        description: t('page.perps.riskLevel.safe.description'),
        color: 'text-rb-green-default',
        bgColor: 'bg-rb-green-light-4',
      },
    };
    return configs[riskLevel];
  }, [riskLevel, t]);

  const { Icon, title, description, color } = riskConfig;

  return (
    <Popup
      closable
      placement="bottom"
      visible={visible}
      onCancel={onClose}
      height={502}
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      isSupportDarkMode
    >
      <div className="flex flex-col h-full bg-r-neutral-bg1 rounded-t-[16px]">
        <div className="text-20 font-medium text-r-neutral-title-1 flex justify-center text-center items-center pt-20 pb-6">
          {t('page.perps.riskLevel.title')}
        </div>
        <div className="text-16 text-r-neutral-foot text-center mb-20">
          {t('page.perps.riskLevel.subTitle')}
        </div>
        <div className="flex flex-col items-center px-[28px]">
          <div className={'flex items-center flex-col gap-4 relative'}>
            <Icon width={240} height={140} />
            <div className={`text-24 font-bold ${color} absolute bottom-12`}>
              {riskConfig.title}
            </div>
          </div>
          <div
            className={`flex items-center px-16 py-16 mb-12 rounded-[4px] justify-between w-full ${riskConfig.bgColor}`}
          >
            <div className={`text-14 ${color} flex items-center gap-4`}>
              {t('page.perps.riskLevel.liquidationDistance')}:
              <TooltipWithMagnetArrow
                overlayClassName="rectangle w-[max-content]"
                placement="top"
                title={t('page.perps.riskLevel.liquidationDistanceTips')}
              >
                <RcIconInfo
                  className={clsx('text-rabby-neutral-foot w-14 h-14', color)}
                />
              </TooltipWithMagnetArrow>
            </div>
            <div className={`text-14 ${color} flex items-center`}>
              {distancePercent}%
            </div>
          </div>
          <div className="mb-12 bg-r-neutral-card2 rounded-[8px] px-16 w-full">
            <div className="text-14 text-r-neutral-foot flex items-center justify-between py-16">
              <div>{t('page.perps.riskLevel.currentPrice')}:</div>
              <div className="text-16 tf text-r-neutral-title-1 font-bold">
                ${splitNumberByStep(markPrice.toFixed(pxDecimals))}
              </div>
            </div>
            <div className="text-14 text-r-neutral-foot flex items-center justify-between py-16">
              <div>{t('page.perps.riskLevel.liquidationPrice')}:</div>
              <div className="text-16 tf text-r-neutral-title-1 font-bold">
                ${splitNumberByStep(liquidationPrice.toFixed(pxDecimals))}
              </div>
            </div>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16 bg-r-neutral-bg2">
          <Button
            block
            size="large"
            type="primary"
            className="h-[48px] text-15 font-medium"
            onClick={onClose}
          >
            {t('page.perps.riskLevel.gotIt')}
          </Button>
        </div>
      </div>
    </Popup>
  );
};

export default RiskLevelPopup;
