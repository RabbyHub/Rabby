import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/ui/component';
import { ReactComponent as RcIconMore } from '@/ui/assets/gas-account/more.svg';

import { useTranslation } from 'react-i18next';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { Button, Dropdown, Menu } from 'antd';
import { GasAccountHistory } from './components/History';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { GasAccountLoginPopup } from './components/LoginPopup';
import { GasAccountDepositPopup } from './components/DepositPopup';
import { useAml, useGasAccountInfo, useGasAccountLogin } from './hooks';
import { ReactComponent as RcIconLogout } from '@/ui/assets/gas-account/logout.svg';
import { GasAccountBlueBorderedButton } from './components/Button';
import { GasAccountLogoutPopup } from './components/LogoutPopop';
import { WithdrawPopup } from './components/WithdrawPopup';
import { useHistory } from 'react-router-dom';
import { GasAccountRefreshIdProvider } from './hooks/context';
import { GasAccountWrapperBg } from './components/WrapperBg';
import { GasAccountBlueLogo } from './components/GasAccountBlueLogo';
import BigNumber from 'bignumber.js';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useRabbySelector } from '@/ui/store';
import { SwitchLoginAddrBeforeDepositModal } from './components/SwitchLoginAddrModal';
import clsx from 'clsx';

const DEPOSIT_LIMIT = 1000;

const GasAccountInner = () => {
  const { t } = useTranslation();
  const [loginVisible, setLoginVisible] = useState(false);

  const [logoutVisible, setLogoutVisible] = useState(false);

  const [depositVisible, setDepositVisible] = useState(false);

  const [withdrawVisible, setWithdrawVisible] = useState(false);

  const history = useHistory();
  const gotoDashboard = () => {
    history.push('/dashboard');
  };

  const { value, loading } = useGasAccountInfo();
  const { isLogin } = useGasAccountLogin({ value, loading });

  const wallet = useWallet();

  const balance = value?.account?.balance || 0;

  const currentAccount = useCurrentAccount();

  const gasAccount = useRabbySelector((s) => s.gasAccount.account);

  const [switchAddrVisible, setSwitchAddrVisible] = useState(false);

  const isRisk = useAml();

  const openDepositPopup = () => {
    if (
      gasAccount?.address &&
      currentAccount?.address !== gasAccount?.address
    ) {
      setSwitchAddrVisible(true);
      return;
    }
    setDepositVisible(true);
  };

  useEffect(() => {
    wallet.clearPageStateCache();
  }, [wallet?.clearPageStateCache]);

  useEffect(() => {
    if (!isLogin) {
      setLoginVisible(true);
    }
  }, [isLogin]);

  useEffect(() => {
    if (!loading && !isLogin) {
      setLoginVisible(true);
    }
  }, [loading, isLogin]);

  const rightItems = React.useMemo(
    () => (
      <Menu
        className="bg-r-neutral-bg-1 rounded-[6px] p-0"
        style={{
          boxShadow: '0px 8px 24px 0px rgba(0, 0, 0, 0.14)',
        }}
      >
        <Menu.Item
          className="px-12 h-40 flex items-center gap-[6px] bg-transparent hover:bg-transparent"
          onClick={() => {
            setLogoutVisible(true);
          }}
        >
          <RcIconLogout className="w-16 h-16" />
          <span className="text-r-red-default text-13 font-medium">
            {t('page.gasAccount.logout')}
          </span>
        </Menu.Item>
      </Menu>
    ),
    [t]
  );

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <PageHeader
        className="mx-[20px] pt-[20px] mb-[20px]"
        forceShowBack
        onBack={gotoDashboard}
        rightSlot={
          <div className="flex items-center gap-20 absolute bottom-0 right-0">
            <Dropdown overlay={rightItems} mouseLeaveDelay={0.3}>
              <RcIconMore
                viewBox="0 0 20 20"
                className="w-20 h-20 cursor-pointer"
              />
            </Dropdown>
          </div>
        }
      >
        <span className="text-20 font-medium text-r-neutral-title-1">
          {t('page.gasAccount.title')}
        </span>
      </PageHeader>

      <div className="flex-1 overflow-auto mx-20">
        <GasAccountWrapperBg className="mb-[20px] flex flex-col items-center h-[260px] bg-r-neutral-card1 rounded-[8px] py-20 px-16 pt-24">
          <GasAccountBlueLogo />
          <div className="text-r-neutral-title-1 text-[32px] leading-normal font-bold mt-24">
            {formatUsdValue(balance, BigNumber.ROUND_DOWN)}
          </div>

          <div className="w-full mt-auto flex gap-12 items-center justify-center relative">
            <TooltipWithMagnetArrow
              className="rectangle w-[max-content]"
              visible={!balance ? undefined : false}
              title={t('page.gasAccount.noBalance')}
            >
              <GasAccountBlueBorderedButton
                block
                className={clsx(!balance && 'opacity-50 cursor-not-allowed')}
                onClick={() => {
                  if (!balance) {
                    return;
                  }
                  setWithdrawVisible(true);
                }}
              >
                {t('page.gasAccount.withdraw')}
              </GasAccountBlueBorderedButton>
            </TooltipWithMagnetArrow>
            <TooltipWithMagnetArrow
              className="rectangle w-[max-content]"
              visible={isRisk || balance >= DEPOSIT_LIMIT ? undefined : false}
              title={
                isRisk
                  ? t('page.gasAccount.risk')
                  : t('page.gasAccount.gasExceed')
              }
            >
              <Button
                disabled={isRisk || balance >= DEPOSIT_LIMIT}
                block
                size="large"
                type="primary"
                className="h-[48px] text-r-neutral-title2 text-15 font-medium"
                onClick={openDepositPopup}
              >
                {t('page.gasAccount.deposit')}
              </Button>
            </TooltipWithMagnetArrow>
          </div>
        </GasAccountWrapperBg>

        <GasAccountHistory />
      </div>

      <GasAccountLoginPopup
        visible={loginVisible}
        onCancel={() => {
          gotoDashboard();
          setLoginVisible(false);
        }}
      />
      <GasAccountLogoutPopup
        visible={logoutVisible}
        onCancel={() => {
          gotoDashboard();
          setLogoutVisible(false);
        }}
      />
      <GasAccountDepositPopup
        visible={depositVisible}
        onCancel={() => setDepositVisible(false)}
      />

      <WithdrawPopup
        visible={withdrawVisible}
        onCancel={() => setWithdrawVisible(false)}
        balance={balance}
      />

      <SwitchLoginAddrBeforeDepositModal
        visible={switchAddrVisible}
        onCancel={() => {
          setSwitchAddrVisible(false);
        }}
      />
    </div>
  );
};

export const GasAccount = () => {
  return (
    <GasAccountRefreshIdProvider>
      <GasAccountInner />
    </GasAccountRefreshIdProvider>
  );
};
