import React from 'react';
import { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { useWallet, isNotification, useApproval } from 'ui/utils';

const SortHat = () => {
  const wallet = useWallet();
  const [to, setTo] = useState('');
  // eslint-disable-next-line prefer-const
  let [approval, , rejectApproval] = useApproval();

  const loadView = async () => {
    const isInNotification = isNotification();
    const isBooted = wallet.isBooted();
    const isUnlocked = wallet.isUnlocked();

    if (!isInNotification) {
      // chrome.window.windowFocusChange won't fire when
      // click popup in the meanwhile notification is present
      await rejectApproval();
      approval = null;
    }

    if (isInNotification && !approval) {
      window.close();
    } else if (!isBooted) {
      setTo('/password');
    } else if (!isUnlocked) {
      setTo('/unlock');
    } else if (approval) {
      setTo('/approval');
    } else {
      setTo('/dashboard');
    }
  };

  useEffect(() => {
    loadView();
  }, []);

  return to ? <Redirect to={to} /> : null;
};

export default SortHat;
