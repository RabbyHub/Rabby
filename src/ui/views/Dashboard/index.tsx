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
import { CHAINS_ENUM } from '@/constant';
import Settings from './components/Settings';
import { useMemoizedFn } from 'ahooks';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';

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

  const location = useLocation();
  const invokeEnterPassphrase = useEnterPassphraseModal('address');
  useEffect(() => {
    const check = async () => {
      const cache = await wallet.getPageStateCache();
      if (
        cache?.path === location.pathname &&
        cache?.states?.action === 'address-backup'
      ) {
        const address = currentAccount?.address;
        if (!address) {
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
              pathname: `/settings/address-backup/mneonics`,
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
    return () => {
      wallet.clearPageStateCache();
    };
  }, [location]);

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

      <Settings visible={settingVisible} onClose={toggleShowMoreSettings} />
    </>
  );
};

export default connectStore()(Dashboard);
