import React from 'react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
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
      setTo(cache.path + (cache.search || ''));
      return;
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
        <>{to && <Navigate to={to} />}</>
      ) : (
        <Spin spinning={!to}>{to && <Navigate to={to} />}</Spin>
      )}
    </div>
  );
};

export default SortHat;
