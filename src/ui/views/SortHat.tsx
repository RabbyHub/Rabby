import React from 'react';
import { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { getUiType, useApproval, useWallet } from 'ui/utils';
import { Spin } from 'ui/component';
import { Approval } from 'background/service/notification';
import Browser from 'webextension-polyfill';

const SortHat = () => {
  const wallet = useWallet();
  const [to, setTo] = useState('');
  // eslint-disable-next-line prefer-const
  let [getApproval] = useApproval();
  const UIType = getUiType();

  const loadView = async () => {
    const start = performance.now();
    const logStep = (step: string, extra?: Record<string, unknown>) => {
      console.debug('[route-perf][SortHat]', step, {
        cost: Math.round(performance.now() - start),
        historyLength: window.history.length,
        ...extra,
      });
    };
    const isInNotification = UIType.isNotification;
    const isInTab = UIType.isTab;
    logStep('loadView start', {
      pathname: window.location.hash,
      isPop: UIType.isPop,
      isNotification: isInNotification,
      isTab: isInTab,
    });
    const approval: Approval | undefined = await getApproval();
    logStep('getApproval resolved', {
      hasApproval: !!approval,
    });
    if (isInNotification && !approval) {
      logStep('close notification');
      Browser.runtime.sendMessage({ type: 'closeNotification' });
      window.close();
      return;
    }

    if (!(await wallet.isBooted())) {
      logStep('redirect welcome');
      setTo('/welcome');
      return;
    }
    logStep('isBooted resolved');

    await wallet.tryUnlock();
    logStep('tryUnlock resolved');
    if (!(await wallet.isUnlocked())) {
      if (
        isInNotification &&
        approval?.data?.approvalComponent === 'Connect' &&
        approval?.data?.params?.$ctx?.providers?.length
      ) {
        logStep('redirect connect approval');
        setTo('/connect-approval');
      } else {
        logStep('redirect unlock');
        setTo('/unlock');
      }
      return;
    }
    logStep('isUnlocked resolved');
    if (
      (await wallet.hasPageStateCache()) &&
      !isInNotification &&
      !isInTab &&
      !approval
    ) {
      logStep('hasPageStateCache resolved', { hasCache: true });
      const cache = (await wallet.getPageStateCache())!;
      logStep('getPageStateCache resolved', {
        cachePath: cache.path,
        cacheSearch: cache.search,
      });
      if (cache.path && cache.path !== '/') {
        // prevent path is empty then extension will stuck
        logStep('redirect cache path', {
          to: cache.path + (cache.search || ''),
        });
        setTo(cache.path + (cache.search || ''));
        return;
      } else {
        wallet.clearPageStateCache();
      }
    } else {
      logStep('hasPageStateCache resolved', { hasCache: false });
    }

    const currentAccount = await wallet.getCurrentAccount();
    logStep('getCurrentAccount resolved', {
      hasCurrentAccount: !!currentAccount,
    });

    if (!currentAccount) {
      logStep('redirect no address');
      setTo('/no-address');
    } else if (approval && isInNotification) {
      logStep('redirect approval');
      setTo('/approval');
    } else {
      logStep('redirect dashboard');
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
