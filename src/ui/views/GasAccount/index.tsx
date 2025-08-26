import React, { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/ui/component';
import { ReactComponent as RcIconMore } from '@/ui/assets/gas-account/more.svg';

import { useTranslation } from 'react-i18next';
import { useWallet } from '@/ui/utils';
import { Dropdown, Menu } from 'antd';
import { GasAccountHistory } from './components/History';
import { GasAccountLoginPopup } from './components/LoginPopup';
import { GasAccountDepositPopup } from './components/DepositPopup';
import {
  useGasAccountInfo,
  useGasAccountLogin,
  useGasAccountHistoryRefresh,
} from './hooks';
import { ReactComponent as RcIconLogout } from '@/ui/assets/gas-account/logout.svg';
import { ReactComponent as RcIconSwitchCC } from '@/ui/assets/gas-account/switch-cc.svg';

import { GasAccountLogoutPopup } from './components/LogoutPopop';
import { WithdrawPopup } from './components/WithdrawPopup';
import { useHistory } from 'react-router-dom';
import {
  GasAccountRefreshIdProvider,
  GasAccountHistoryRefreshIdProvider,
} from './hooks/context';
import { useRabbyDispatch } from '@/ui/store';
import { SwitchLoginAddrBeforeDepositModal } from './components/SwitchLoginAddrModal';
import { GasAccountCard } from './components/GasAccountCard';
import { EVENTS } from '@/constant';
import { useGasAccountRefresh } from './hooks';
import eventBus from '@/eventBus';

const GasAccountInner = () => {
  const { t } = useTranslation();
  const [loginVisible, setLoginVisible] = useState(false);

  const [logoutVisible, setLogoutVisible] = useState(false);

  const [depositVisible, setDepositVisible] = useState(false);

  const [refreshHistoryKey, setRefreshHistoryKey] = useState(0);

  const [withdrawVisible, setWithdrawVisible] = useState(false);

  const history = useHistory();
  const gotoDashboard = () => {
    history.push('/dashboard');
  };

  const goBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      gotoDashboard();
    }
  };

  const { value: gasAccount, loading } = useGasAccountInfo();
  const { isLogin } = useGasAccountLogin({ value: gasAccount, loading });

  const wallet = useWallet();

  const balance = gasAccount?.account?.balance || 0;

  // const gasAccount = useRabbySelector((s) => s.gasAccount.account);

  const [switchAddrVisible, setSwitchAddrVisible] = useState(false);

  const dispatch = useRabbyDispatch();
  const { refresh } = useGasAccountRefresh();
  const { refreshHistory } = useGasAccountHistoryRefresh();

  const handleRefreshHistory = useCallback(() => {
    setRefreshHistoryKey((prevKey) => prevKey + 1);
    refreshHistory();
  }, [setRefreshHistoryKey, refreshHistory]);

  // 监听 Gas Account 登录回调事件
  useEffect(() => {
    const handleCloseWindow = () => {
      window.close();
    };
    eventBus.addEventListener(
      EVENTS.GAS_ACCOUNT.CLOSE_WINDOW,
      handleCloseWindow
    );

    return () => {
      eventBus.removeEventListener(
        EVENTS.GAS_ACCOUNT.CLOSE_WINDOW,
        handleCloseWindow
      );
    };
  }, [dispatch, refresh, handleRefreshHistory]);

  useEffect(() => {
    dispatch.addressManagement.getHilightedAddressesAsync().then(() => {
      dispatch.accountToDisplay.getAllAccountsToDisplay();
    });
  }, []);

  const openDepositPopup = () => {
    setDepositVisible(true);
  };

  useEffect(() => {
    wallet.clearPageStateCache();
  }, [wallet?.clearPageStateCache]);

  const rightItems = React.useMemo(
    () => (
      <Menu
        className="bg-r-neutral-bg-1 rounded-[6px] p-0"
        style={{
          boxShadow: '0px 8px 24px 0px rgba(0, 0, 0, 0.14)',
        }}
      >
        <Menu.Item
          className="px-12 h-40 flex items-center gap-[6px] bg-transparent hover:bg-transparent border-b-[0.5px] border-solid border-rabby-neutral-line"
          onClick={() => {
            setLoginVisible(true);
          }}
        >
          <RcIconSwitchCC className="w-16 h-16 text-r-neutral-title-1" />
          <span className="text-r-neutral-title-1 text-13 font-medium">
            {t('page.gasAccount.switchAccount')}
          </span>
        </Menu.Item>

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
        onBack={goBack}
        rightSlot={
          isLogin ? (
            <div className="flex items-center gap-20 absolute bottom-0 right-0">
              <Dropdown overlay={rightItems} mouseLeaveDelay={0.3}>
                <RcIconMore
                  viewBox="0 0 20 20"
                  className="w-20 h-20 cursor-pointer"
                />
              </Dropdown>
            </div>
          ) : null
        }
      >
        <span className="text-20 font-medium text-r-neutral-title-1">
          {t('page.gasAccount.title')}
        </span>
      </PageHeader>

      <div className="flex-1 overflow-auto mx-20">
        <GasAccountCard
          isLogin={isLogin}
          onLoginPress={() => {
            setLoginVisible(true);
          }}
          onDepositPress={openDepositPopup}
          onWithdrawPress={() => {
            if (!balance) {
              return;
            }
            setWithdrawVisible(true);
          }}
          gasAccountInfo={gasAccount?.account}
        />

        <GasAccountHistory
          key={refreshHistoryKey + `-${isLogin}-${gasAccount?.account}`}
        />
      </div>

      <GasAccountLoginPopup
        visible={loginVisible}
        onCancel={() => {
          setLoginVisible(false);
        }}
      />
      <GasAccountLogoutPopup
        visible={logoutVisible}
        onCancel={() => {
          setLogoutVisible(false);
        }}
      />
      <GasAccountDepositPopup
        visible={depositVisible}
        handleRefreshHistory={handleRefreshHistory}
        onCancel={() => setDepositVisible(false)}
      />

      <WithdrawPopup
        visible={withdrawVisible}
        onCancel={() => setWithdrawVisible(false)}
        handleRefreshHistory={handleRefreshHistory}
        balance={gasAccount?.account.withdrawable_balance || 0}
        gasAccountInfo={gasAccount?.account}
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
      <GasAccountHistoryRefreshIdProvider>
        <GasAccountInner />
      </GasAccountHistoryRefreshIdProvider>
    </GasAccountRefreshIdProvider>
  );
};
