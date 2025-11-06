import React from 'react';
import { ReactComponent as TokenEmptySVG } from '@/ui/assets/dashboard/full-token-empty.svg';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface Props {
  className?: string;
  text?: string;
}

export const TokenListEmpty: React.FC<Props> = ({ className, text }) => {
  const { t } = useTranslation();
  text = text || t('page.dashboard.assets.table.lowValueDescription');

  return (
    <div
      className={clsx(
        'h-full flex flex-col justify-center items-center py-[100px]',
        className
      )}
    >
      <TokenEmptySVG className="m-auto" />
      <div className="mt-[8px] text-r-neutral-foot text-13 font-medium text-center">
        {text}
      </div>
    </div>
  );
};
