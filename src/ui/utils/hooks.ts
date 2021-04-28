import { useEffect, useReducer } from 'react';
import { useHistory } from 'react-router-dom';
import { useWallet } from './WalletContext';
import { isNotification } from './index';

export const useApproval = () => {
  const wallet = useWallet();
  const approval = wallet.getApproval();
  const history = useHistory();

  const resolveApproval = () => {
    if (approval) {
      wallet.resolveApproval();
    }
    setTimeout(() => {
      history.push('/');
    });
  };

  const rejectApproval = async (err) => {
    if (approval) {
      await wallet.rejectApproval(err);
    }
    history.push('/');
  };

  useEffect(() => {
    if (!isNotification()) {
      return;
    }
    window.addEventListener('beforeunload', rejectApproval);

    return () => window.removeEventListener('beforeunload', rejectApproval);
  }, []);

  return [approval, resolveApproval, rejectApproval];
};

export const usePopupOpen = () => {
  const wallet = useWallet();

  useEffect(() => {
    if (isNotification()) {
      return;
    }

    wallet.setPopupOpen(true);

    const beforeunload = () => {
      wallet.setPopupOpen(false);
    };

    window.addEventListener('beforeunload', beforeunload);
  }, []);
};
