import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { useHistory } from 'react-router-dom';
import remarkGfm from 'remark-gfm';

import { Modal } from 'ui/component';
import { connectStore, useRabbyDispatch, useRabbySelector } from 'ui/store';
import { useWallet } from 'ui/utils';
import './style.less';

import PendingApproval from './components/PendingApproval';

import { CurrentConnection } from './components/CurrentConnection';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardPanel } from './components/DashboardPanel';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { GasPriceBar } from './components/GasPriceBar';
import { CHAINS_ENUM } from '@/constant';
import Settings from './components/Settings';
import { useMemoizedFn } from 'ahooks';

const Dashboard = () => {
  const history = useHistory();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const currentAccount = useCurrentAccount();

  const { firstNotice, updateContent, version } = useRabbySelector((s) => ({
    ...s.appVersion,
  }));

  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  const getCurrentAccount = async () => {
    const account = await dispatch.account.getCurrentAccountAsync();
    if (!account) {
      history.replace('/no-address');
      return;
    }
  };

  useEffect(() => {
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
      await dispatch.addressManagement.getHilightedAddressesAsync();
      dispatch.accountToDisplay.getAllAccountsToDisplay();
      const pendingCount = await wallet.getPendingApprovalCount();
      setPendingApprovalCount(pendingCount);
      const hasAnyAccountClaimedGift = await wallet.getHasAnyAccountClaimedGift();
      dispatch.gift.setField({ hasClaimedGift: hasAnyAccountClaimedGift });
    })();
  }, []);

  useEffect(() => {
    dispatch.appVersion.checkIfFirstLoginAsync();
  }, [dispatch]);

  const { t } = useTranslation();
  const [currentConnectedSiteChain, setCurrentConnectedSiteChain] = useState(
    CHAINS_ENUM.ETH
  );

  const [settingVisible, setSettingVisible] = useState(false);
  const toggleShowMoreSettings = useMemoizedFn(() => {
    setSettingVisible(!settingVisible);
  });

  return (
    <>
      <div className={clsx('dashboard')}>
        <DashboardHeader onSettingClick={toggleShowMoreSettings} />
        <DashboardPanel onSettingClick={toggleShowMoreSettings} />
        <div className="px-[16px] pb-[11px]">
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

      <Settings visible={settingVisible} onClose={toggleShowMoreSettings} />
    </>
  );
};

export default connectStore()(Dashboard);
