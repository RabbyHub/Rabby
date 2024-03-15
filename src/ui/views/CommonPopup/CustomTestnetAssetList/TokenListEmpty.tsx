import React from 'react';
import { ReactComponent as TokenEmptySVG } from '@/ui/assets/dashboard/token-empty.svg';
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
    <div className={clsx('mt-[117px]', className)}>
      <TokenEmptySVG className="m-auto" />
      <div className="mt-[24px] text-r-neutral-body text-13 text-center">
        {text}
      </div>
    </div>
  );
};
