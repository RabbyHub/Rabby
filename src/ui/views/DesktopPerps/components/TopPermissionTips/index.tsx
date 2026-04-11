import React from 'react';
import { ReactComponent as RcIconShort } from 'ui/assets/perps/IconProTips.svg';
import { useTranslation } from 'react-i18next';
import { useRabbySelector } from '@/ui/store';

export const TopPermissionTips = () => {
  const { t } = useTranslation();
  const hasPermission = useRabbySelector((state) => state.perps.hasPermission);

  if (hasPermission) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4 text-rb-orange-default text-13 font-medium bg-rb-orange-light-1 w-full h-[32px] rounded-[8px] mb-12">
      <RcIconShort />
      {t('page.perps.permissionTips')}
    </div>
  );
};
