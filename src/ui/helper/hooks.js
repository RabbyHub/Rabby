import { useEffect, useReducer } from 'react';
import { useHistory } from 'react-router-dom';
import { useWallet } from './WalletContext';
import { isNotification } from '.';

export const useForceUpdate = () => {
  const [, forceUpdate] = useReducer(_ => Object.create(null));

  return forceUpdate;
}

export const useApproval = () => {
  const wallet = useWallet();
  const approval = wallet.getApproval();
  const history = useHistory();

  const handleNext = (err, res) => {
    if (approval) {
      wallet.handleApproval(approval.id, { err, res });
    }
    history.push('/');
  }

  useEffect(() => {
    const beforeunload = () => {
      handleNext('user reject');
    }

    window.addEventListener('beforeunload', beforeunload);

    return () => window.removeEventListener('beforeunload', beforeunload);
  }, []);


  return [approval, handleNext];
}
