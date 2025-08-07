import React, { useState } from 'react';
import { GasAccountBlueLogo } from './GasAccountBlueLogo';
import { GasAccountWrapperBg } from './WrapperBg';
import { ReactComponent as RcIconQuoteStart } from '@/ui/assets/gas-account/quote-start.svg';
import { ReactComponent as RcIconQuoteEnd } from '@/ui/assets/gas-account/quote-end.svg';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { useRabbySelector, useRabbyDispatch } from 'ui/store';
import { useWallet } from 'ui/utils';
import { useGasAccountMethods } from '../hooks';
import { ReactComponent as IconGift } from '@/ui/assets/gift-18.svg';
import { EVENTS } from '@/constant';
import clsx from 'clsx';
import eventBus from '@/eventBus';
import { isNoSignAccount } from '@/utils/account';

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
  const { currentGiftEligible, currentAccount } = useRabbySelector((s) => ({
    currentGiftEligible: s.gift.currentGiftEligible,
    currentAccount: s.account.currentAccount,
  }));

  const handleLoginAndClaim = async () => {
    if (!currentAccount?.address) return;
    setIsLoading(true);

    try {
      let signature: string = '';
      if (isNoSignAccount(currentAccount)) {
        signature = await login(currentAccount, true);
      } else {
        signature = await wallet.signGasAccount(currentAccount, true);
      }
      dispatch.gasAccount.setGasAccountSig({
        sig: signature,
        account: currentAccount,
      });
      await dispatch.gift.claimGiftAsync({
        address: currentAccount.address,
        currentAccount,
      });
      eventBus.emit(EVENTS.GAS_ACCOUNT.LOGIN_CALLBACK);
    } catch (error) {
      console.error('🔍 handleLoginAndClaim - 登录失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    if (currentGiftEligible) {
      handleLoginAndClaim();
    } else if (onLoginPress) {
      onLoginPress();
    }
  };

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
          onClick={handleClick}
          type="primary"
          block
          loading={isLoading}
          className={clsx(
            'h-[48px] text-15 font-medium leading-normal text-r-neutral-title2',
            'flex items-center justify-center',
            currentGiftEligible ? 'bg-green border-green gap-6' : ''
          )}
        >
          {currentGiftEligible ? (
            <>
              <IconGift viewBox="0 0 18 18" className="w-18 h-18" />
              <span>{t('page.gasAccount.loginInTip.loginAndClaim')}</span>
            </>
          ) : (
            t('page.gasAccount.loginInTip.login')
          )}
        </Button>
      </div>
    </GasAccountWrapperBg>
  );
};
