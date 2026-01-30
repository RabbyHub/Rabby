import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';

export const BorrowToCapTip: React.FC<{ className?: string }> = ({
  className,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`flex items-center justify-center gap-8 py-8 px-10 rounded-[8px] bg-rb-red-light-1 ${
        className || ''
      }`}
    >
      <RcIconWarningCC
        viewBox="0 0 16 16"
        className="w-18 h-18 text-rb-red-default flex-shrink-0"
      />
      <span className="text-[14px] leading-[18px] font-medium text-rb-red-default">
        {t('page.lending.borrowOverview.reachCapTip')}
      </span>
    </div>
  );
};
