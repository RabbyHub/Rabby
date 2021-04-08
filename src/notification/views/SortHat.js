import { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { useEth, isNotification, WINDOW_TYPE } from 'popup/utils';

const SortHat = () => {
  const eth = useEth();
  const [to, setTo] = useState();

  useEffect(() => {
    const isInNotification = isNotification();
    const approval = eth.getApproval();
    const hasVault = eth.hasVault();
    const isUnlocked = eth.isUnlocked();

    if (isInNotification && !approval) {
      window.close();
    } else if (!hasVault) {
      setTo('/import');
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
