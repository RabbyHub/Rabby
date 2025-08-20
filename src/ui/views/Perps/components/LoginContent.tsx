import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconPerps } from 'ui/assets/perps/imgPerps.svg';
import React from 'react';

export const PerpsLoginContent = ({
  clickLoginBtn,
}: {
  clickLoginBtn: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 overflow-auto mx-20">
      <div className="bg-r-neutral-card1 rounded-[12px] p-20 flex flex-col items-center">
        <RcIconPerps className="w-40 h-40" />
        <div className="text-20 font-medium text-r-neutral-title-1 mt-16">
          {t('page.perps.tradePerps')}
        </div>
        <div className="text-13 text-r-neutral-body mt-12">
          {t('page.perps.logInTips')}
        </div>
        <Button
          block
          size="large"
          type="primary"
          className="h-[48px] text-r-neutral-title2 text-15 font-medium"
          style={{
            height: 48,
          }}
          onClick={() => {
            clickLoginBtn();
          }}
        >
          {t('page.perps.logInPerpsAccount')}
        </Button>
        <Button
          block
          size="large"
          type="ghost"
          className="h-[48px] text-r-neutral-body text-15 font-medium"
          style={{
            height: 48,
          }}
        >
          {t('page.perps.learnAboutPerps')}
        </Button>
      </div>
    </div>
  );
};
