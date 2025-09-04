import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconPerps } from 'ui/assets/perps/imgPerps.svg';
import React from 'react';

export const PerpsLoginContent = ({
  clickLoginBtn,
  onLearnAboutPerps,
}: {
  clickLoginBtn: () => void;
  onLearnAboutPerps: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-r-neutral-card1 rounded-[12px] p-20 flex flex-col items-center">
        <RcIconPerps className="w-40 h-40" />
        <div className="text-20 font-medium text-r-neutral-title-1 mt-8">
          {t('page.perps.tradePerps')}
        </div>
        <div className="text-13 text-r-neutral-body mt-12 text-center">
          {t('page.perps.logInTips')}
        </div>
        <Button
          block
          size="large"
          type="primary"
          className="h-[48px] text-r-neutral-title2 text-15 font-medium mt-24"
          style={{
            height: 48,
          }}
          onClick={() => {
            clickLoginBtn();
          }}
        >
          {t('page.perps.logInPerpsAccount')}
        </Button>
        <div
          className="h-[48px] text-r-neutral-body text-15 font-medium mt-16 bg-r-neutral-card2 flex items-center justify-center w-full rounded-[6px]
          border-transparent
          cursor-pointer
          border-[1px]
          border-solid
          hover:bg-r-blue-light1 hover:border-rabby-blue-default"
          style={{
            height: 48,
          }}
          onClick={onLearnAboutPerps}
        >
          {t('page.perps.learnAboutPerps')}
        </div>
      </div>
    </div>
  );
};
