import { Card } from '@/ui/component/NewUserImport';
import React from 'react';
import { Button } from 'antd';
import clsx from 'clsx';

export const CommonConfirmCard: React.FC<{
  hasStep?: boolean;
  onNext: () => void;
  logoClassName?: string;
  logo?: React.ReactNode;
  titleText?: string;
  descriptionText?: string;
  buttonText?: string;
}> = ({
  hasStep = false,
  onNext,
  logoClassName,
  logo,
  titleText,
  descriptionText,
  buttonText,
}) => {
  return (
    <Card
      className="text-center relative"
      headerBlock={hasStep}
      step={hasStep ? 1 : undefined}
    >
      <div className="absolute mt-[100px] inset-0 px-20 pb-16">
        <div className={clsx('w-80 m-auto', logoClassName)}>{logo}</div>
        <h1
          className={clsx('text-24 font-medium text-r-neutral-title1', 'mt-32')}
        >
          {titleText}
        </h1>
        <p className={clsx('mt-16 mx-16', 'text-15 text-r-neutral-body')}>
          {descriptionText}
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
            {buttonText}
          </Button>
        </div>
      </div>
    </Card>
  );
};
