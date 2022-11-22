import { SecurityCheckDecision } from '@debank/rabby-api/dist/types';
import React from 'react';
import { useWallet } from '../utils';

export const usePhishDetect = (origin: string) => {
  const wallet = useWallet();
  const [decision, setDecision] = React.useState<SecurityCheckDecision>(
    'loading'
  );
  const [alert, setAlert] = React.useState('');

  const detect = async (url: string) => {
    const account = await wallet.getCurrentAccount();
    const res = await wallet.openapi.checkOrigin(account!.address, url);

    setDecision(res.decision);
    setAlert(res.alert);
  };

  React.useEffect(() => {
    detect(origin);
  }, [origin]);

  return {
    decision,
    alert,
  };
};
