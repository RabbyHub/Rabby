import React, { useState } from 'react';
import { Button, Tooltip } from 'antd';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useMemoizedFn } from 'ahooks';
import { ReactComponent as RcIconGasAccountTip1 } from 'ui/assets/gas-account/tip1.svg';
import { ReactComponent as RcIconGasAccountTip2 } from 'ui/assets/gas-account/tip2.svg';
import { ReactComponent as RcIconGasAccountTip3 } from 'ui/assets/gas-account/tip3.svg';

interface NewUserProcessProps extends Omit<PopupProps, 'onConfirm'> {
  onComplete?: () => void;
}

const STEPS_LENGTH = 3;

export const GasAccountNewUserProcessPopup: React.FC<NewUserProcessProps> = ({
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
              {t('page.gasAccount.about.title1')}
            </div>
            <div className="text-14 text-r-neutral-body mt-8 mb-[26px]">
              {t('page.gasAccount.about.desc1')}
            </div>
            <div className="flex items-center justify-center">
              <RcIconGasAccountTip1
                viewBox="0 0 80 80"
                width={80}
                height={80}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-center">
            <div className="text-20 font-medium text-r-neutral-title-1">
              {t('page.gasAccount.about.title2')}
            </div>
            <div className="text-14 text-r-neutral-body mt-8 mb-20">
              {t('page.gasAccount.about.desc2')}
            </div>
            <div className="flex items-center justify-center">
              <RcIconGasAccountTip2
                width={360}
                height={110}
                viewBox="0 0 360 111"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center">
            <div className="text-20 font-medium text-r-neutral-title-1">
              {t('page.gasAccount.about.title3')}
            </div>
            <div className="text-14 text-r-neutral-body mt-8 mb-[55px]">
              {t('page.gasAccount.about.desc3')}
            </div>
            <div className="flex items-center justify-center">
              <RcIconGasAccountTip3
                // className="w-[240px] h-[180px]"
                width={272}
                height={58}
                viewBox="0 0 272 58"
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
      height={380}
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

export default GasAccountNewUserProcessPopup;
