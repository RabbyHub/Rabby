import { useEffect, useReducer } from 'react';
import { useHistory } from 'react-router-dom';
import { useEth } from './EthContext';
import { isNotification } from './';

export const useForceUpdate = () => {
  const [, forceUpdate] = useReducer(_ => Object.create(null));

  return forceUpdate;
}

export const useApproval = () => {
  const eth = useEth();
  const approval = eth.getApproval();
  const history = useHistory();

  const handleNext = (err, res) => {
    if (approval) {
      eth.handleApproval(approval.id, { err, res });
    }
    history.push('/')
  }

  useEffect(() => {
    // if the user closes notification, the the request will be rejected
    if (!isNotification()) return;

    const beforeunload = () => {
      handleNext('reject');
    }

    window.addEventListener('beforeunload', beforeunload);

    return () => window.removeEventListener('beforeunload', beforeunload);
  }, []);


  return [approval, handleNext];
}
