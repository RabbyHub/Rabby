import React from 'react';
import { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { useWallet, getUiType, useApproval } from 'ui/utils';
import { Spin } from 'ui/component';

const SortHat = () => {
  const wallet = useWallet();
  const [to, setTo] = useState('');
  // eslint-disable-next-line prefer-const
  let [approval, , rejectApproval] = useApproval();

  const loadView = async () => {
    const isInNotification = getUiType().isNotification;

    if (isInNotification && !approval) {
      window.close();
      return;
    }

    if (!isInNotification) {
      // chrome.window.windowFocusChange won't fire when
      // click popup in the meanwhile notification is present
      await rejectApproval();
      approval = undefined;
    }

    if (!wallet.isBooted()) {
      setTo('/welcome');
      return;
    }

    if (!wallet.isUnlocked()) {
      setTo('/unlock');
      return;
    }

    if (await wallet.getPreMnemonics()) {
      setTo('/create-mnemonics');
      return;
    }

    const currentAccount = await wallet.getCurrentAccount();

    if (!currentAccount) {
      setTo('/no-address');
    } else if (approval) {
      setTo('/approval');
    } else {
      setTo('/dashboard');
    }
  };

  useEffect(() => {
    loadView();
  }, []);

  return <Spin spinning={!to}>{to && <Redirect to={to} />}</Spin>;
};

export default SortHat;
