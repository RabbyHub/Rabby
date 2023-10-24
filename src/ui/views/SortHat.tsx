import React from 'react';
import { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { getUiType, useApproval, useWallet } from 'ui/utils';
import { Spin } from 'ui/component';
import { Approval } from 'background/service/notification';

const SortHat = () => {
  const wallet = useWallet();
  const [to, setTo] = useState('');
  // eslint-disable-next-line prefer-const
  let [getApproval] = useApproval();
  const UIType = getUiType();

  const loadView = async () => {
    const isInNotification = UIType.isNotification;
    const isInTab = UIType.isTab;
    const approval: Approval | undefined = await getApproval();
    if (isInNotification && !approval) {
      window.close();
      return;
    }

    if (!(await wallet.isBooted())) {
      setTo('/welcome');
      return;
    }

    if (!(await wallet.isUnlocked())) {
      setTo('/unlock');
      return;
    }
    if (
      (await wallet.hasPageStateCache()) &&
      !isInNotification &&
      !isInTab &&
      !approval
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
