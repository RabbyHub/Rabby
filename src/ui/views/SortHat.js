import { useEffect, useState } from 'react';
import { Redirect, use } from 'react-router-dom';
import { useWallet, isNotification, WINDOW_TYPE } from 'ui/helper';

const SortHat = () => {
  const wallet = useWallet();
  const [to, setTo] = useState();

  useEffect(() => {
    const isInNotification = isNotification();
    const approval = wallet.getApproval();
    const isSetup = wallet.isSetup();
    const isUnlocked = wallet.isUnlocked();

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
  }, [])

  return to ? <Redirect to={to} /> : null
}

export default SortHat;
