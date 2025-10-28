import React, { useState } from 'react';
import { GasAccountBlueLogo } from './GasAccountBlueLogo';
import { GasAccountWrapperBg } from './WrapperBg';
import { ReactComponent as RcIconQuoteStart } from '@/ui/assets/gas-account/quote-start.svg';
import { ReactComponent as RcIconQuoteEnd } from '@/ui/assets/gas-account/quote-end.svg';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { useRabbySelector, useRabbyDispatch } from 'ui/store';
import { formatUsdValue, useWallet } from 'ui/utils';
import { useGasAccountMethods } from '../hooks';
import { ReactComponent as IconGift } from '@/ui/assets/gift-18.svg';
import clsx from 'clsx';

export const GasAccountLoginCard = ({
  onLoginPress,
}: {
  onLoginPress?(): void;
}) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useGasAccountMethods();
  const { giftUsdValue, currentAccount } = useRabbySelector((s) => ({
    giftUsdValue: s.gift.giftUsdValue,
    currentAccount: s.account.currentAccount,
  }));

  const handleLoginAndClaim = async () => {
    if (!currentAccount?.address) return;
    setIsLoading(true);

    try {
      await login(currentAccount, true);
    } catch (error) {
      console.error('🔍 handleLoginAndClaim - 登录失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    if (giftUsdValue > 0) {
      handleLoginAndClaim();
    } else if (onLoginPress) {
      onLoginPress();
    }
  };

  return (
    <GasAccountWrapperBg className="mb-[20px] flex flex-col items-center h-[280px] bg-r-neutral-card1 rounded-[8px] px-16 py-24 relative">
      <GasAccountBlueLogo className="mt-4 mb-18" />
      <div className="relative flex text-[17px] font-medium text-r-blue-default">
        <RcIconQuoteStart
          viewBox="0 0 11 9"
          className="absolute top-0 left-[-16px]"
        />
        {t('page.gasAccount.loginInTip.loginTips1')}
      </div>
      <div className="text-[17px] font-medium text-r-blue-default">
        {t('page.gasAccount.loginInTip.loginTips2')}
      </div>
      <div className="flex gap-8 text-[17px] font-medium text-r-blue-default relative">
        {t('page.gasAccount.loginInTip.loginTips3')}
        <RcIconQuoteEnd
          viewBox="0 0 11 9"
          className="absolute top-[6px] right-[-16px]"
        />
      </div>
      <div className="w-full mt-auto">
        <Button
          onClick={handleClick}
          type="primary"
          block
          loading={isLoading}
          className={clsx(
            'h-[48px] text-15 font-medium leading-normal text-r-neutral-title2',
            'flex items-center justify-center',
            giftUsdValue > 0 ? 'bg-green border-green gap-6' : ''
          )}
        >
          {giftUsdValue > 0 ? (
            <>
              <IconGift viewBox="0 0 18 18" className="w-18 h-18" />
              <span>
                {t('page.gasAccount.loginInTip.loginAndClaim', {
                  usdValue: formatUsdValue(giftUsdValue),
                })}
              </span>
            </>
          ) : (
            t('page.gasAccount.loginInTip.login')
          )}
        </Button>
      </div>
    </GasAccountWrapperBg>
  );
};
