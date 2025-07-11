import React from 'react';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/riskWarning-cc.svg';
import { useTranslation } from 'react-i18next';

export const RiskWarningTitle = () => {
  const { t } = useTranslation();
  return (
    <div className="flex justify-center items-center gap-4 mb-[17px]">
      <div className="text-r-red-default">
        <RcIconWarningCC />
      </div>
      <div className="text-[15px] font-medium text-r-red-default">
        {t('component.RiskTip.title')}
      </div>
    </div>
  );
};
