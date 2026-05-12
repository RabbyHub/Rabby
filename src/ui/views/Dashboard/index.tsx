import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { useHistory, useLocation } from 'react-router-dom';
import remarkGfm from 'remark-gfm';

import { AuthenticationModal, Modal } from 'ui/component';
import { connectStore, useRabbyDispatch, useRabbySelector } from 'ui/store';
import { useWallet } from 'ui/utils';
import './style.less';

import PendingApproval from './components/PendingApproval';

import { CurrentConnection } from './components/CurrentConnection';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardPanel } from './components/DashboardPanel';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { GasPriceBar } from './components/GasPriceBar';
import { CHAINS_ENUM, KEYRING_CLASS } from '@/constant';
import Settings from './components/Settings';
import { useMemoizedFn, useMount } from 'ahooks';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { useGasAccountDiscovery } from '@/ui/views/GasAccount/hooks';

const Dashboard = () => {
  const dashboardRenderStart = performance.now();
  const history = useHistory();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const currentAccount = useCurrentAccount();
  const { refreshDiscovery } = useGasAccountDiscovery({
    autoRefresh: false,
  });

  const { firstNotice, updateContent, version } = useRabbySelector((s) => ({
    ...s.appVersion,
  }));
  const accountsDiscoveryKey = useRabbySelector((s) =>
    s.accountToDisplay.accountsList
      .map(
        (account) =>
          `${account.address.toLowerCase()}:${account.type}:${
            account.brandName || ''
          }`
      )
      .sort()
      .join('|')
  );

  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  const getCurrentAccount = async () => {
    const start = performance.now();
    const account = await dispatch.account.getCurrentAccountAsync();
    console.debug('[route-perf][Dashboard] getCurrentAccount resolved', {
      cost: Math.round(performance.now() - start),
      hasCurrentAccount: !!account,
      historyLength: window.history.length,
    });
    if (!account) {
      history.replace('/no-address');
      return;
    }
  };

  useEffect(() => {
    console.debug('[route-perf][Dashboard] mounted', {
      costFromRender: Math.round(performance.now() - dashboardRenderStart),
      historyLength: window.history.length,
      pathname: history.location.pathname,
    });
    getCurrentAccount();
  }, []);

  useEffect(() => {
    if (currentAccount) {
      dispatch.gift.checkGiftEligibilityAsync({
        address: currentAccount.address,
        currentAccount,
      });
    }
  }, [currentAccount]);

  useEffect(() => {
    (async () => {
      const start = performance.now();
      await dispatch.addressManagement.getHilightedAddressesAsync();
      console.debug('[route-perf][Dashboard] highlighted addresses resolved', {
        cost: Math.round(performance.now() - start),
      });
      dispatch.accountToDisplay.getAllAccountsToDisplay();
      const pendingCount = await wallet.getPendingApprovalCount();
      console.debug('[route-perf][Dashboard] pending approval count resolved', {
        cost: Math.round(performance.now() - start),
        pendingCount,
      });
      setPendingApprovalCount(pendingCount);
      const hasAnyAccountClaimedGift = await wallet.getHasAnyAccountClaimedGift();
      console.debug('[route-perf][Dashboard] gift status resolved', {
        cost: Math.round(performance.now() - start),
        hasAnyAccountClaimedGift,
      });
      dispatch.gift.setField({ hasClaimedGift: hasAnyAccountClaimedGift });
    })();
  }, []);

  useEffect(() => {
    if (!accountsDiscoveryKey) {
      return;
    }
    refreshDiscovery().catch((error) => {
      console.error(
        '[gasAccount] refresh discovery on account change failed',
        error
      );
    });
  }, [accountsDiscoveryKey, refreshDiscovery]);

  useEffect(() => {
    dispatch.appVersion.checkIfFirstLoginAsync();
  }, [dispatch]);

  const { t } = useTranslation();
  const [currentConnectedSiteChain, setCurrentConnectedSiteChain] = useState(
    CHAINS_ENUM.ETH
  );

  const [settingVisible, setSettingVisible] = useState(false);
  const [autoScrollToBiometric, setAutoScrollToBiometric] = useState(false);
  const toggleShowMoreSettings = useMemoizedFn(() => {
    setSettingVisible(!settingVisible);
  });

  const location = useLocation();
  const invokeEnterPassphrase = useEnterPassphraseModal('address');
  useMount(() => {
    const check = async () => {
      const cache = await wallet.getPageStateCache();
      if (
        cache?.path === location.pathname &&
        cache?.states?.action === 'open-settings'
      ) {
        wallet.clearPageStateCache();
        setAutoScrollToBiometric(true);
        setSettingVisible(true);
        return;
      }

      if (
        cache?.path === location.pathname &&
        cache?.states?.action === 'address-backup'
      ) {
        wallet.clearPageStateCache();
        const address = currentAccount?.address;
        if (!address) {
          return;
        }
        if (currentAccount?.type !== KEYRING_CLASS.MNEMONIC) {
          return;
        }
        const hasBackup = await wallet.checkSeedPhraseBackup(address);
        if (hasBackup) {
          return;
        }
        let data = '';

        await AuthenticationModal({
          confirmText: t('global.confirm'),
          cancelText: t('global.Cancel'),
          title: t('page.addressDetail.backup-seed-phrase'),
          validationHandler: async (password: string) => {
            await invokeEnterPassphrase(address);

            data = await wallet.getMnemonics(password, address);
          },
          onFinished() {
            history.push({
              pathname: '/settings/address-backup/mneonics',
              state: {
                data: data,
                goBack: true,
              },
            });
          },
          onCancel() {
            // do nothing
          },
          wallet,
        });
      }
    };
    check();
  });

  return (
    <>
      <div className={clsx('dashboard')}>
        <DashboardHeader onSettingClick={toggleShowMoreSettings} />
        <DashboardPanel onSettingClick={toggleShowMoreSettings} />
        <div className="px-[16px] pb-[13px]">
          <GasPriceBar currentConnectedSiteChain={currentConnectedSiteChain} />
          <CurrentConnection onChainChange={setCurrentConnectedSiteChain} />
        </div>
      </div>
      <Modal
        visible={firstNotice && updateContent}
        title={t('page.dashboard.home.whatsNew')}
        className="first-notice"
        onCancel={() => {
          dispatch.appVersion.afterFirstLogin();
        }}
        maxHeight="420px"
      >
        <div>
          <p className="mb-12">{version}</p>
          <ReactMarkdown children={updateContent} remarkPlugins={[remarkGfm]} />
        </div>
      </Modal>

      {pendingApprovalCount > 0 && (
        <PendingApproval
          onRejectAll={() => {
            setPendingApprovalCount(0);
          }}
          count={pendingApprovalCount}
        />
      )}

      <Settings
        visible={settingVisible}
        onClose={toggleShowMoreSettings}
        autoScrollToBiometric={autoScrollToBiometric}
        onAutoScrollDone={() => {
          setAutoScrollToBiometric(false);
        }}
      />
    </>
  );
};

export default connectStore()(Dashboard);
