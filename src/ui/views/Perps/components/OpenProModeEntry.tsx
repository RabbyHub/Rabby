import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconDiamond } from '@/ui/assets/perps/IconDiamond.svg';
import { ReactComponent as RcIconBoldJump } from '@/ui/assets/perps/IconBoldJump.svg';
import { useWallet } from '@/ui/utils';

export const OpenProModeEntry: React.FC = () => {
  const { t } = useTranslation();
  const wallet = useWallet();

  return (
    <div className="mx-20">
      <div
        className="flex items-center justify-between mt-12 px-12 h-[32px] rounded-[8px] cursor-pointer border border-solid border-transparent hover:border-rabby-blue-default group w-full bg-r-blue-light-2"
        onClick={() => {
          wallet.openInDesktop('/desktop/perps');
        }}
      >
        <div className="flex items-center gap-6">
          <RcIconDiamond className="w-16 h-16" />
          <span className="text-[12px] text-r-blue-default font-bold">
            {t('page.perps.openProModeInTab')}
          </span>
        </div>
        <RcIconBoldJump />
      </div>
    </div>
  );
};
