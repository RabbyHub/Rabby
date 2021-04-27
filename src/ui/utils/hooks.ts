import { useEffect, useReducer } from 'react';
import { useHistory } from 'react-router-dom';
import { useWallet } from './WalletContext';

export const useForceUpdate = () => {
  const [, forceUpdate] = useReducer((_) => Object.create(null));

  return forceUpdate;
};

export const useApproval = () => {
  const wallet = useWallet();
  const approval = wallet.getApproval();
  const history = useHistory();

  const handleNext = (err) => {
    if (approval) {
      wallet.handleApproval(err);
    }
    history.push('/');
  };

  useEffect(() => {
    const beforeunload = () => {
      handleNext('user reject');
    };

    window.addEventListener('beforeunload', beforeunload);

    return () => window.removeEventListener('beforeunload', beforeunload);
  }, []);

  return [approval, handleNext];
};
