import { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { useWallet, isNotification, useApproval } from 'ui/utils';

const SortHat = () => {
  const wallet = useWallet();
  const [to, setTo] = useState();
  const [, handleNext] = useApproval();

  useEffect(() => {
    const isInNotification = isNotification();
    const approval = wallet.getApproval();
    const isSetup = wallet.isSetup();
    const isUnlocked = wallet.isUnlocked();

    if (!isInNotification) {
      // chrome.window.windowFocusChange won't fire when
      // click popup in the meanwhile notification is present
      handleNext('');
    }

    if (isInNotification && !approval) {
      window.close();
    } else if (!isSetup) {
      setTo('/password');
    } else if (!isUnlocked) {
      setTo('/unlock');
    } else if (approval) {
      setTo('/approval');
    } else {
      setTo('/dashboard');
    }
  }, []);

  return to ? <Redirect to={to} /> : null;
};

export default SortHat;
