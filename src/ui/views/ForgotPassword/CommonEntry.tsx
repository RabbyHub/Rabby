import { Card } from '@/ui/component/NewUserImport';
import React from 'react';
import { ReactComponent as LockSVG } from '@/ui/assets/forgot/lock.svg';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import clsx from 'clsx';

export const CommonEntry: React.FC<{
  hasStep: boolean;
  onNext: () => void;
}> = ({ hasStep = false, onNext }) => {
  const { t } = useTranslation();

  return (
    <Card
      className="text-center relative"
      headerBlock={hasStep}
      step={hasStep ? 1 : undefined}
    >
      <div className="absolute mt-[100px] inset-0 px-20 pb-16">
        <div className="p-16 rounded-full bg-r-neutral-card2 w-80 m-auto">
          <LockSVG />
        </div>
        <h1
          className={clsx('text-24 font-medium text-r-neutral-title1', 'mt-32')}
        >
          {t('page.forgotPassword.home.title')}
        </h1>
        <p className={clsx('mt-16', 'text-15 text-r-neutral-body')}>
          {t('page.forgotPassword.home.description')}
        </p>
        <div
          className={clsx(
            'flex flex-col items-center absolute bottom-0 inset-x-0 py-16 px-20',
            'border-t-[0.5px] border-solid border-rabby-neutral-line'
          )}
        >
          <Button
            onClick={onNext}
            block
            type="primary"
            className={clsx(
              'h-[48px] shadow-none rounded-[6px]',
              'text-[15px] font-medium'
            )}
          >
            {t('page.forgotPassword.home.button')}
          </Button>
        </div>
      </div>
    </Card>
  );
};
