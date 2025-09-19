import React, { useState } from 'react';
import { Button, Tooltip } from 'antd';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useMemoizedFn } from 'ahooks';
import { ReactComponent as RcIconPerps } from 'ui/assets/perps/ImgPerpetual.svg';
import { ReactComponent as RcIconPerpsLong } from 'ui/assets/perps/ImgGoLong.svg';
import { ReactComponent as RcIconPerpsShort } from 'ui/assets/perps/ImgGoShort.svg';
import { ReactComponent as RcIconPerpsLeverage } from 'ui/assets/perps/ImgLeverage.svg';
import { ReactComponent as RcIconPerpsLiquidation } from 'ui/assets/perps/ImgLiquidation.svg';

interface NewUserProcessProps extends Omit<PopupProps, 'onConfirm'> {
  onComplete?: () => void;
}

const STEPS_LENGTH = 5;

export const NewUserProcessPopup: React.FC<NewUserProcessProps> = ({
  visible,
  onCancel,
  onComplete,
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);

  React.useEffect(() => {
    if (!visible) {
      setCurrentStep(1);
    }
  }, [visible]);

  const handleNext = useMemoizedFn(() => {
    if (currentStep < STEPS_LENGTH) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
      onCancel?.();
    }
  });

  const renderStepIndicator = () => (
    <div className="flex justify-center items-center mb-6">
      <div className="flex items-center gap-4">
        {Array.from({ length: STEPS_LENGTH }).map((_, index) => (
          <React.Fragment key={index}>
            <div
              className={clsx(
                'h-[6px] rounded-full',
                currentStep === index + 1 ? 'w-[16px]' : 'w-[6px]',
                currentStep === index + 1
                  ? 'bg-r-blue-default'
                  : 'bg-r-blue-light2'
              )}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center">
            <div className="text-20 font-medium text-r-neutral-title-1">
              {t('page.perps.newUserProcess.firstTitle')}
            </div>
            <div className="text-14 text-r-neutral-body mt-12 mb-12">
              {t('page.perps.newUserProcess.firstDescription')}
            </div>
            <div className="flex items-center justify-center mb-8">
              <RcIconPerps
                className="w-[240px] h-[180px] text-r-neutral-title1"
                width={240}
                height={180}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-center">
            <div className="text-20 font-medium text-r-neutral-title-1">
              {t('page.perps.newUserProcess.secondTitle')}
            </div>
            <div className="text-14 text-r-neutral-body mt-12 mb-12">
              {t('page.perps.newUserProcess.secondDescription')}
            </div>
            <div className="flex items-center justify-center mb-8 h-[220px]">
              <RcIconPerpsLong
                className="w-[240px] h-[180px]"
                width={240}
                height={180}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center">
            <div className="text-20 font-medium text-r-neutral-title-1">
              {t('page.perps.newUserProcess.thirdTitle')}
            </div>
            <div className="text-14 text-r-neutral-body mt-12 mb-12">
              {t('page.perps.newUserProcess.thirdDescription')}
            </div>
            <div className="flex items-center justify-center mb-8">
              <RcIconPerpsShort
                className="w-[240px] h-[180px]"
                width={240}
                height={180}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center">
            <div className="text-20 font-medium text-r-neutral-title-1">
              {t('page.perps.newUserProcess.fourthTitle')}
            </div>
            <div className="text-14 text-r-neutral-body mt-12 mb-12">
              {t('page.perps.newUserProcess.fourthDescription')}
            </div>
            <div className="flex items-center justify-center mb-8">
              <RcIconPerpsLeverage
                className="w-[336px] h-[180px]"
                width={336}
                height={180}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center">
            <div className="text-20 font-medium text-r-neutral-title-1">
              {t('page.perps.newUserProcess.fifthTitle')}
            </div>
            <div className="text-14 text-r-neutral-body mt-12">
              {t('page.perps.newUserProcess.fifthDescription')}
            </div>
            <div className="flex items-center justify-center mb-8 h-[220px]">
              <RcIconPerpsLiquidation
                className="w-[336px] h-[180px]"
                width={336}
                height={180}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Popup
      placement="bottom"
      height={460}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={true}
      closable={false}
      visible={visible}
      onCancel={onCancel}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
        <div className="px-20 pt-20">{renderStepIndicator()}</div>

        <div className="flex-1 px-20 mt-12">{renderStepContent()}</div>

        <div className="border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16">
          <Button
            block
            size="large"
            type="primary"
            className="h-[48px] text-15 font-medium flex-1"
            onClick={handleNext}
          >
            {currentStep < STEPS_LENGTH
              ? t('page.perps.newUserProcess.next')
              : t('page.perps.newUserProcess.gotIt')}
          </Button>
        </div>
      </div>
    </Popup>
  );
};

export default NewUserProcessPopup;
