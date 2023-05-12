import clsx from 'clsx';
import React from 'react';

export interface Props {
  className?: string;
  Signal: React.ReactNode;
  Content: React.ReactNode;
  onClickButton: () => void;
  ButtonText: React.ReactNode;
}

export const CommonStatusBar: React.FC<Props> = ({
  className,
  Content,
  Signal,
  onClickButton,
  ButtonText,
}) => {
  return (
    <div
      className={clsx(
        'relative',
        'py-[6px] pl-[8px] pr-[6px] rounded-[4px]',
        'flex flex-row items-center justify-between',
        'text-[13px]',
        className
      )}
    >
      <div className="flex flex-row items-start">
        {Signal}
        <div className={clsx('ml-[4px]')}>{Content}</div>
      </div>

      <div
        onClick={onClickButton}
        className={clsx(
          'underline cursor-pointer',
          'absolute right-[8px] top-[6px]'
        )}
      >
        {ButtonText}
      </div>
    </div>
  );
};
