import React from 'react';
import { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { getUiType, useWallet } from 'ui/utils';
import { getCurrentApproval } from '@/ui/approval/global';
import { Spin } from 'ui/component';
import { Approval } from 'background/service/notification';
import Browser from 'webextension-polyfill';

const SortHat = () => {
  const wallet = useWallet();
  const [to, setTo] = useState('');
  const UIType = getUiType();

  const loadView = async () => {
    const isInNotification = UIType.isNotification;
    const isInTab = UIType.isTab;
    const approvalPromise = getCurrentApproval(wallet) as Promise<
      Approval | undefined
    >;
    const isBootedPromise = wallet.isBooted();
    // The no-approval path may return before this prefetched request is awaited.
    void isBootedPromise.catch(() => undefined);
    const approval = await approvalPromise;
    if (isInNotification && !approval) {
      Browser.runtime.sendMessage({ type: 'closeNotification' });
      window.close();
      return;
    }

    if (!(await isBootedPromise)) {
      setTo('/welcome');
      return;
    }

    const isUnlocked = await wallet.tryUnlock();
    if (!isUnlocked) {
      if (
        isInNotification &&
        approval?.data?.approvalComponent === 'Connect' &&
        approval?.data?.params?.$ctx?.providers?.length
      ) {
        setTo('/connect-approval');
      } else {
        setTo('/unlock');
      }
      return;
    }
    if (
      !isInNotification &&
      !isInTab &&
      !approval &&
      (await wallet.hasPageStateCache())
    ) {
      const cache = (await wallet.getPageStateCache())!;
      if (cache.path && cache.path !== '/') {
        // prevent path is empty then extension will stuck
        setTo(cache.path + (cache.search || ''));
        return;
      } else {
        wallet.clearPageStateCache();
      }
    }

    const currentAccount = await wallet.getCurrentAccount();

    if (!currentAccount) {
      setTo('/no-address');
    } else if (approval && isInNotification) {
      setTo('/approval');
    } else {
      setTo('/dashboard');
    }
  };

  useEffect(() => {
    loadView();
    return () => {
      setTimeout(() => {
        const skeleton = document.querySelector('#skeleton');
        if (skeleton) {
          document.head.removeChild(skeleton);
        }
      }, 16);
    };
  }, []);

  return (
    <div className="h-full flex items-center justify-center">
      {UIType.isPop ? (
        <>{to && <Redirect to={to} />}</>
      ) : (
        <Spin spinning={!to}>{to && <Redirect to={to} />}</Spin>
      )}
    </div>
  );
};

export default SortHat;
