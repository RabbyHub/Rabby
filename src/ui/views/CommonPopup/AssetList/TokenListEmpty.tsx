import React from 'react';
import { ReactComponent as TokenEmptySVG } from '@/ui/assets/dashboard/token-empty.svg';
import clsx from 'clsx';

interface Props {
  className?: string;
  text?: string;
}

export const TokenListEmpty: React.FC<Props> = ({
  className,
  text = 'Low value assets will be shown here',
}) => {
  return (
    <div className={clsx('mt-[117px]', className)}>
      <TokenEmptySVG className="m-auto" />
      <div className="mt-[24px] text-gray-subTitle text-13 text-center">
        {text}
      </div>
    </div>
  );
};
