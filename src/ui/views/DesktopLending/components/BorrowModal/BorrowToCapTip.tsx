import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/lending/warning-2.svg';

export const BorrowToCapTip: React.FC<{ className?: string }> = ({
  className,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`flex items-center justify-center gap-8 py-8 px-10 rounded-[8px] bg-rb-neutral-card-1 ${
        className || ''
      }`}
    >
      <RcIconWarningCC
        width={12}
        height={12}
        className="text-rb-red-default flex-shrink-0 -mt-2 mr-2"
      />
      <span className="text-[13px] leading-[15px] font-medium text-rb-red-default">
        {t('page.lending.borrowOverview.reachCapTip')}
      </span>
    </div>
  );
};
