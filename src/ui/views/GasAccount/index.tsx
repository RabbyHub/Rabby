import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/ui/component';

import { useTranslation } from 'react-i18next';
import { isSameAddress, useWallet } from '@/ui/utils';
import { Button, message } from 'antd';
import clsx from 'clsx';
import { GasAccountLoginPopup } from './components/GasAccountLoginPopup';
import { GasAccountDepositPopup } from './components/GasAccountDepositPopup';
import {
  useGasAccountInfo,
  useGasAccountLogin,
  useGasAccountHistoryRefresh,
  useGasAccountDiscovery,
  useGasAccountHistory,
  useGasAccountInfoV2,
  useGasAccountEligibility,
  useGasAccountSign,
} from './hooks';

import { GasAccountLogoutPopup } from './components/GasAccountLogoutPopup';
import { useHistory, useLocation } from 'react-router-dom';
import {
  GasAccountRefreshIdProvider,
  GasAccountHistoryRefreshIdProvider,
} from './hooks/context';
import { useRabbyDispatch } from '@/ui/store';
import { EVENTS } from '@/constant';
import { useGasAccountRefresh } from './hooks';
import eventBus from '@/eventBus';
import { GasAccountEmptyState } from './components/GasAccountEmptyState';
import { getGasAccountEmptyStatePrimaryMode } from './components/GasAccountEmptyState.utils';
import { GasAccountUserState } from './components/GasAccountUserState';
import { GasAccountHeader } from './components/HeaderRight';
import { ReactComponent as IconGift } from '@/ui/assets/gift-18.svg';
import { formatUsdValue } from '@/ui/utils/number';
import { WithdrawPopup } from './components/WithdrawPopup';

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

  const goBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      gotoDashboard();
    }
  };

  const { value: gasAccount, loading } = useGasAccountInfo();
  const { isLogin, login } = useGasAccountLogin({ value: gasAccount, loading });
  const {
    pendingHardwareAccount,
    accountsWithGasAccountBalance,
  } = useGasAccountDiscovery();
  const { account: currentGasAccount } = useGasAccountSign();
  const historyState = useGasAccountHistory();
  const {
    claimGift,
    currentEligibleAddress,
    checkAddressesEligibility,
  } = useGasAccountEligibility();
  const { value: pendingHardwareGasAccountInfo } = useGasAccountInfoV2({
    address: pendingHardwareAccount?.address,
  });

  const wallet = useWallet();

  const balance = gasAccount?.account?.balance || 0;
  const pendingHardwareBalance =
    pendingHardwareGasAccountInfo?.account?.balance || 0;
  const visibleBalance = Number(
    isLogin ? balance : pendingHardwareAccount ? pendingHardwareBalance : 0
  );
  const [emptyStateLoading, setEmptyStateLoading] = useState(false);

  const dispatch = useRabbyDispatch();
  const { refresh } = useGasAccountRefresh();
  const { refreshHistory } = useGasAccountHistoryRefresh();

  const handleRefreshHistory = useCallback(() => {
    refreshHistory();
  }, [refreshHistory]);

  const hasHistory = Boolean(
    historyState.txList?.rechargeList?.length ||
      historyState.txList?.withdrawList?.length ||
      historyState.txList?.list?.length
  );
  const showEmptyState =
    (!isLogin && !pendingHardwareAccount) ||
    (isLogin &&
      !historyState.loading &&
      Number(balance || 0) === 0 &&
      !hasHistory);
  const emptyStatePrimaryMode = getGasAccountEmptyStatePrimaryMode({
    isLogin,
    hasPendingHardwareAccount: !!pendingHardwareAccount,
    hasEligibleGiftAddress: !!currentEligibleAddress?.isEligible,
  });
  const canSwitchWallet = useMemo(
    () =>
      accountsWithGasAccountBalance.some(
        (item) =>
          !currentGasAccount?.address ||
          !isSameAddress(item.address, currentGasAccount.address) ||
          item.type !== currentGasAccount.type
      ),
    [
      accountsWithGasAccountBalance,
      currentGasAccount?.address,
      currentGasAccount?.type,
    ]
  );

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

  useEffect(() => {
    if (isLogin || pendingHardwareAccount) {
      return;
    }

    checkAddressesEligibility().catch((error) => {
      console.error('checkAddressesEligibility on GasAccount error', error);
    });
  }, [checkAddressesEligibility, isLogin, pendingHardwareAccount]);

  const openDepositPopup = () => {
    setDepositVisible(true);
  };

  const handleEmptyStatePrimaryPress = useCallback(async () => {
    if (emptyStateLoading) {
      return;
    }

    if (
      emptyStatePrimaryMode === 'claimGift' &&
      currentEligibleAddress?.isEligible
    ) {
      setEmptyStateLoading(true);
      try {
        await claimGift(currentEligibleAddress.address);
        refresh();
        handleRefreshHistory();
      } catch (error) {
        console.error('handleEmptyStatePrimaryPress claimGift error', error);
      } finally {
        setEmptyStateLoading(false);
      }
      return;
    }

    openDepositPopup();
  }, [
    claimGift,
    currentEligibleAddress?.address,
    currentEligibleAddress?.isEligible,
    emptyStateLoading,
    emptyStatePrimaryMode,
    handleRefreshHistory,
    refresh,
  ]);

  const handleUserStatePrimaryPress = useCallback(async () => {
    if (emptyStateLoading) {
      return;
    }
    if (!isLogin && pendingHardwareAccount) {
      setEmptyStateLoading(true);
      try {
        await login(pendingHardwareAccount);
        refresh();
        handleRefreshHistory();
        message.success(t('page.gasAccount.loginSuccess'));
        openDepositPopup();
      } catch (error) {
        console.error('handleOldUserStatePrimaryPress error', error);
        message.error(t('page.gasAccount.loginFailed'));
      } finally {
        setEmptyStateLoading(false);
      }
      return;
    }

    openDepositPopup();
  }, [emptyStateLoading]);

  const lowBalanceWarningMessage =
    visibleBalance > 0 && visibleBalance <= 0.1
      ? t('page.gasAccount.lowBalance', {
          defaultValue:
            "You don't have enough gas. Deposit gas to ensure future transactions go smoothly.",
        })
      : undefined;

  const emptyStatePrimaryContent =
    emptyStatePrimaryMode === 'claimGift' &&
    currentEligibleAddress?.isEligible ? (
      <span className="inline-flex items-center gap-6">
        <IconGift viewBox="0 0 18 18" className="w-18 h-18" />
        <span>
          {t('page.gasAccount.claimFreeGas', {
            usdValue: formatUsdValue(currentEligibleAddress.giftUsdValue),
            defaultValue: 'Claim {{usdValue}} Free Gas',
          })}
        </span>
      </span>
    ) : undefined;
  const primaryButtonClassName =
    showEmptyState && emptyStatePrimaryMode === 'claimGift'
      ? 'bg-green border-green gap-6'
      : undefined;
  const primaryButtonContent = showEmptyState
    ? emptyStatePrimaryContent ||
      t('page.gasAccount.depositNow', {
        defaultValue: 'Deposit Now',
      })
    : t('page.gasAccount.depositNow', {
        defaultValue: 'Deposit Now',
      });
  const handlePrimaryButtonPress = showEmptyState
    ? handleEmptyStatePrimaryPress
    : handleUserStatePrimaryPress;

  useEffect(() => {
    wallet.clearPageStateCache();
  }, [wallet?.clearPageStateCache]);

  return (
    <div className="h-full min-h-full overflow-hidden bg-r-neutral-bg2 flex flex-col">
      <PageHeader
        className="mx-[20px] pt-[20px] mb-[16px]"
        forceShowBack
        onBack={goBack}
        rightSlot={
          <GasAccountHeader
            isLogin={isLogin}
            canSwitchWallet={canSwitchWallet}
            onSwitchWallet={() => setLoginVisible(true)}
            onWithdraw={() => setWithdrawVisible(true)}
            onLogout={() => setLogoutVisible(true)}
          />
        }
      >
        <span className="text-20 font-medium text-r-neutral-title-1">
          {t('page.gasAccount.gasDeposit', {
            defaultValue: 'Gas Deposit',
          })}
        </span>
      </PageHeader>

      <div className="flex-1 min-h-0 overflow-y-auto px-20">
        {showEmptyState ? (
          <GasAccountEmptyState />
        ) : (
          <GasAccountUserState
            balance={visibleBalance}
            historyState={historyState}
            warningMessage={lowBalanceWarningMessage}
          />
        )}
      </div>

      <div className="shrink-0 border-t-[0.5px] border-solid border-rabby-neutral-line bg-r-neutral-bg2 px-20 py-14">
        <Button
          onClick={handlePrimaryButtonPress}
          type="primary"
          block
          loading={emptyStateLoading}
          className={clsx(
            'h-[44px] rounded-[8px] text-15 font-medium leading-normal text-r-neutral-title2',
            'flex items-center justify-center',
            primaryButtonClassName
          )}
        >
          {primaryButtonContent}
        </Button>
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
        onDeposit={handleRefreshHistory}
        onCancel={() => setDepositVisible(false)}
      />

      <WithdrawPopup
        visible={withdrawVisible}
        onCancel={() => setWithdrawVisible(false)}
        handleRefreshHistory={handleRefreshHistory}
        balance={gasAccount?.account.withdrawable_balance || 0}
        gasAccountInfo={gasAccount?.account}
      />
    </div>
  );
};

export const GasAccount = () => {
  const { search } = useLocation<{
    resetId: string;
  }>();
  const resetKey = useMemo(() => {
    const query = new URLSearchParams(search || '');
    return query.get('resetKey') || '';
  }, [search]);

  return (
    <GasAccountRefreshIdProvider>
      <GasAccountHistoryRefreshIdProvider>
        <GasAccountInner key={resetKey} />
      </GasAccountHistoryRefreshIdProvider>
    </GasAccountRefreshIdProvider>
  );
};
