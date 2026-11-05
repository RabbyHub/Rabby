import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TpSlScope } from '../../positionTpSl';

export const TpSlIntroCard: React.FC<{
  scope: TpSlScope;
  onDismiss: () => void;
}> = ({ scope, onDismiss }) => {
  const { t } = useTranslation();
  const isPartial = scope === 'partial';

  return (
    <div className="flex flex-col gap-[12px] rounded-[6px] bg-rb-neutral-bg-5 px-[16px] py-[12px]">
      <div className="flex flex-col gap-[6px]">
        <div className="text-[12px] leading-[16px] font-medium text-rb-neutral-title-1">
          {isPartial
            ? t('page.perpsPro.positionTpSl.introPartialTitle')
            : t('page.perpsPro.positionTpSl.introPositionTitle')}
        </div>
        <div className="text-[12px] leading-[16px] text-rb-neutral-foot">
          {isPartial
            ? t('page.perpsPro.positionTpSl.introPartialDesc')
            : t('page.perpsPro.positionTpSl.introPositionDesc')}
        </div>
      </div>
      <button
        type="button"
        className="h-[32px] w-full rounded-[6px] border-0 bg-rb-neutral-bg-5 text-[12px] leading-[18px] font-medium text-rb-neutral-title-1 hover:opacity-80"
        onClick={onDismiss}
      >
        {t('page.perpsPro.positionTpSl.gotIt')}
      </button>
    </div>
  );
};
