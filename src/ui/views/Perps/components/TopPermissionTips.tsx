import React from 'react';
import { ReactComponent as RcIconShort } from 'ui/assets/perps/IconTopTips.svg';
import { useTranslation } from 'react-i18next';

export const TopPermissionTips = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center gap-4 text-r-neutral-title text-13 font-medium bg-r-orange-light w-full h-[32px] border-b-[0.5px] border-rabby-neutral-line">
      <RcIconShort />
      {t('page.perps.permissionTips')}
    </div>
  );
};
