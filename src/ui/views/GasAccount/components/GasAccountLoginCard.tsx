import React from 'react';
import { GasAccountBlueLogo } from './GasAccountBlueLogo';
import { GasAccountWrapperBg } from './WrapperBg';
import { ReactComponent as RcIconQuoteStart } from '@/ui/assets/gas-account/quote-start.svg';
import { ReactComponent as RcIconQuoteEnd } from '@/ui/assets/gas-account/quote-end.svg';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';

export const GasAccountLoginCard = ({
  onLoginPress,
}: {
  onLoginPress?(): void;
}) => {
  const { t } = useTranslation();
  return (
    <GasAccountWrapperBg className="mb-[20px] flex flex-col items-center h-[260px] bg-r-neutral-card1 rounded-[8px] py-20 px-16 pt-24 relative">
      <GasAccountBlueLogo className="mt-4 mb-18" />
      <div className="relative flex gap-8 mb-[16px] text-18 font-medium text-r-blue-default">
        <RcIconQuoteStart
          viewBox="0 0 11 9"
          className="absolute top-0 left-[-20px]"
        />
        {t('page.gasAccount.loginInTip.title')}
      </div>
      <div className="flex gap-8 text-18 font-medium text-r-blue-default relative">
        {t('page.gasAccount.loginInTip.desc')}
        <RcIconQuoteEnd
          viewBox="0 0 11 9"
          className="absolute top-0 right-[-20px]"
        />
      </div>
      <div className="w-full mt-auto">
        <Button
          onClick={onLoginPress}
          type="primary"
          block
          className="h-[48px] text-15 font-medium leading-normal text-r-neutral-title2"
        >
          {t('page.gasAccount.loginInTip.login')}
        </Button>
      </div>
    </GasAccountWrapperBg>
  );
};
