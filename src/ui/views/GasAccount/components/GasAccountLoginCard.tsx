import React, { useState, useEffect } from 'react';
import { GasAccountBlueLogo } from './GasAccountBlueLogo';
import { GasAccountWrapperBg } from './WrapperBg';
import { ReactComponent as RcIconQuoteStart } from '@/ui/assets/gas-account/quote-start.svg';
import { ReactComponent as RcIconQuoteEnd } from '@/ui/assets/gas-account/quote-end.svg';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { useRabbySelector, useRabbyDispatch } from 'ui/store';
import { useWallet } from 'ui/utils';
import { useGasAccountMethods, useGasAccountSign } from '../hooks'; // 添加useGasAccountSign
import { ReactComponent as IconGift } from '@/ui/assets/gift-18.svg';
import { KEYRING_CLASS } from '@/constant'; // 导入KEYRING_CLASS常量
import clsx from 'clsx';

export const GasAccountLoginCard = ({
  onLoginPress,
  onRefreshHistory,
}: {
  onLoginPress?(): void;
  onRefreshHistory?(): void;
}) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [shouldClaimAfterLogin, setShouldClaimAfterLogin] = useState(false); // 跟踪是否需要在登录后claim
  const { login } = useGasAccountMethods();
  const { sig: currentSig, accountId: currentAccountId } = useGasAccountSign(); // 添加当前签名状态
  const { currentGiftEligible, currentAccount } = useRabbySelector((s) => ({
    currentGiftEligible: s.gift.currentGiftEligible,
    currentAccount: s.account.currentAccount,
  }));

  // 组件卸载时的清理逻辑
  useEffect(() => {
    return () => {
      // 这里可以添加一些清理逻辑，比如取消正在进行的操作
    };
  }, []);

  // 监听登录状态变化，在登录成功后自动claim
  useEffect(() => {
    const handleLoginSuccess = async () => {
      if (
        shouldClaimAfterLogin &&
        currentSig &&
        currentAccountId &&
        currentAccount?.address
      ) {
        console.log('Gas account login detected, proceeding to claim gift');
        setShouldClaimAfterLogin(false); // 重置标志

        try {
          const success = await dispatch.gift.claimGiftAsync({
            address: currentAccount.address,
            currentAccount,
          });

          if (success) {
            console.log('Gift claimed successfully after login!');
            onRefreshHistory?.();
          } else {
            console.error('Failed to claim gift after login');
          }
        } catch (error) {
          console.error('Error during gift claim:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleLoginSuccess();
  }, [
    currentSig,
    currentAccountId,
    shouldClaimAfterLogin,
    currentAccount,
    dispatch,
    onRefreshHistory,
  ]);

  const handleLoginAndClaim = async () => {
    if (!currentAccount?.address) return;
    setIsLoading(true);

    try {
      console.log('Starting gas account login for gift claim...');

      // 检查账户类型
      const noSignType =
        currentAccount?.type === KEYRING_CLASS.PRIVATE_KEY ||
        currentAccount?.type === KEYRING_CLASS.MNEMONIC;

      if (noSignType) {
        // 私钥/助记词账户：使用现有的监听机制
        setShouldClaimAfterLogin(true);
        await login(currentAccount);
        // useEffect会监听状态变化并自动claim
      } else {
        // 其他账户类型：直接调用signGasAccountAndClaimGift
        console.log(
          'Using hardware wallet or other account type for login and claim...'
        );

        try {
          // 调用新的方法，一次性完成登录和claim
          const success = await wallet.signGasAccountAndClaimGift(
            currentAccount
          );

          if (success) {
            console.log(
              'Gift claimed successfully after hardware wallet login!'
            );
            onRefreshHistory?.();
          } else {
            console.error('Failed to claim gift after hardware wallet login');
          }
        } catch (error) {
          // 处理硬件钱包登录错误（用户取消、设备未连接等）
          console.log('Hardware wallet login error:', error);

          // 检查是否是用户取消操作
          if (
            error?.message?.includes('User rejected') ||
            error?.message?.includes('cancelled') ||
            error?.message?.includes('denied') ||
            error?.code === 4001
          ) {
            console.log('User cancelled hardware wallet login');
            // 用户取消，不显示错误，只是重置loading状态
          } else {
            console.error('Hardware wallet login failed:', error);
            // 其他错误，可以考虑显示错误提示
          }
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error during login:', error);
      setShouldClaimAfterLogin(false);
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
