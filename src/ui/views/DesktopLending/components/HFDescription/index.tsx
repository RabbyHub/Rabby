import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Modal } from 'antd';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';
import { HealthFactorBar } from './HealthFactorBar';

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
  //const numHf = Number(hf || '0');
  //const showWarning = numHf < HF_COLOR_GOOD_THRESHOLD;

  return (
    <Modal {...modalStyle} visible={visible} onCancel={onClose}>
      <div className=" bg-r-neutral-bg2 rounded-[12px] px-[20px] py-[16px]">
        <p className="text-[20px] leading-[24px] font-medium text-rb-neutral-title-1 text-center mb-0">
          {t('page.lending.hfTitle')}
        </p>
        <div className="pt-[16px] w-full">
          <p className="text-[13px] leading-[18px] font-normal text-rb-neutral-foot mb-[12px]">
            {t('page.lending.lqDescription.introText')}
          </p>

          <div className="mb-[20px] bg-r-neutral-card1 rounded-[8px] p-[16px]">
            <div className="flex items-start">
              <div className="text-[13px] leading-[15px] font-normal text-rb-neutral-foot flex-1">
                <span className="font-semibold text-r-green-default">
                  {t('page.lending.lqDescription.over3title')}
                </span>{' '}
                {t('page.lending.lqDescription.over3desc')}
              </div>
            </div>
            <div className="flex items-start mt-[10px]">
              <div className="text-[13px] leading-[15px] font-normal text-rb-neutral-foot flex-1">
                <span className="font-semibold text-rb-red-default">
                  {t('page.lending.lqDescription.below1title')}
                </span>{' '}
                {t('page.lending.lqDescription.below1desc')}
              </div>
            </div>
            <div className="flex items-start mt-[12px]">
              <div className="text-[13px] leading-[15px] font-normal text-rb-neutral-foot flex-1">
                <span className="font-semibold text-rb-neutral-title-1">
                  {t('page.lending.lqDescription.liquidationTitle')}
                </span>{' '}
                {t('page.lending.lqDescription.liquidation')}
              </div>
            </div>
            <HealthFactorBar healthFactor={hf} />
          </div>
        </div>

        {/*{showWarning && (
          <div
            className={clsx(
              'mt-[20px] flex items-start gap-[10px] py-[12px] px-[10px] rounded-[8px]',
              'bg-rb-red-light-1'
            )}
          >
            <RcIconWarningCC
              width={16}
              height={16}
              className="text-rb-red-default shrink-0 mt-[2px]"
            />
            <p
              className={clsx(
                'text-[14px] leading-[18px] font-medium text-rb-red-default',
                'flex-1 whitespace-pre-line'
              )}
            >
              {t('page.lending.lqDescription.warningText')}
            </p>
          </div>
        )}*/}
      </div>
    </Modal>
  );
};
