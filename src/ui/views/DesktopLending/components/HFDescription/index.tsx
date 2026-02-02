import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from 'antd';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { HealthFactorBar } from './HealthFactorBar';
import { HF_COLOR_GOOD_THRESHOLD } from '../../utils/constant';

const modalStyle = {
  width: 400,
  title: null as React.ReactNode,
  bodyStyle: { background: 'transparent', padding: 0 } as const,
  maskClosable: true,
  footer: null as React.ReactNode,
  zIndex: 1000,
  className: 'modal-support-darkmode',
  closeIcon: ModalCloseIcon,
  centered: true,
  maskStyle: {
    zIndex: 1000,
    backdropFilter: 'blur(8px)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
};

export const HFDescription: React.FC<{
  visible: boolean;
  hf: string;
  onClose: () => void;
}> = ({ visible, hf, onClose }) => {
  const { t } = useTranslation();
  const numHf = Number(hf || '0');
  const showWarning = numHf < HF_COLOR_GOOD_THRESHOLD;

  return (
    <Modal {...modalStyle} visible={visible} onCancel={onClose}>
      <div className="bg-rb-neutral-bg-1 rounded-[12px] p-[24px]">
        <p className="text-[18px] leading-[24px] font-bold text-rb-neutral-title-1 text-center">
          {t('page.lending.hfTitle')}
        </p>
        <div className="pt-[8px] w-full">
          <p className="text-[14px] leading-[20px] font-normal text-rb-neutral-body mb-[20px]">
            {t('page.lending.lqDescription.introText')}
          </p>

          <div className="mb-[20px] space-y-[6px]">
            <div className="flex items-start gap-[12px]">
              <div className="w-[6px] h-[6px] rounded-full bg-rb-neutral-foot mt-[6px] shrink-0" />
              <p className="text-[14px] leading-[20px] font-normal text-rb-neutral-body flex-1">
                <span className="font-semibold text-r-green-default">
                  {t('page.lending.lqDescription.over3title')}
                </span>{' '}
                {t('page.lending.lqDescription.over3desc')}
              </p>
            </div>
            <div className="flex items-start gap-[12px]">
              <div className="w-[6px] h-[6px] rounded-full bg-rb-neutral-foot mt-[6px] shrink-0" />
              <p className="text-[14px] leading-[20px] font-normal text-rb-neutral-body flex-1">
                <span className="font-semibold text-rb-red-default">
                  {t('page.lending.lqDescription.below1title')}
                </span>{' '}
                {t('page.lending.lqDescription.below1desc')}
              </p>
            </div>
            <div className="flex items-start gap-[12px]">
              <div className="w-[6px] h-[6px] rounded-full bg-rb-neutral-foot mt-[6px] shrink-0" />
              <p className="text-[14px] leading-[20px] font-normal text-rb-neutral-body flex-1">
                {t('page.lending.lqDescription.liquidation')}
              </p>
            </div>
          </div>

          <HealthFactorBar healthFactor={hf} />
        </div>

        {showWarning && (
          <div className="mt-[20px] flex items-start gap-[10px] py-[12px] px-[10px] rounded-[8px] bg-rb-red-light-1">
            <RcIconWarningCC
              width={16}
              height={16}
              className="text-rb-red-default shrink-0 mt-[2px]"
            />
            <p className="text-[14px] leading-[18px] font-medium text-rb-red-default flex-1 whitespace-pre-line">
              {t('page.lending.lqDescription.warningText')}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
