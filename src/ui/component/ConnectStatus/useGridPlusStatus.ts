import React from 'react';
import { useWallet } from '@/ui/utils';
import { useInterval } from 'react-use';

export const useGridPlusStatus = () => {
  const wallet = useWallet();
  const [isConnect, setIsConnect] = React.useState(false);
  const getConnectStatus = () => {
    wallet.gridPlusIsConnect().then((res) => setIsConnect(!!res));
  };
  const [connectLoading, setConnectLoading] = React.useState(false);

  React.useEffect(() => {
    getConnectStatus();
  }, []);

  useInterval(() => {
    getConnectStatus();
  }, 1000 * 2);

  const status: 'CONNECTED' | 'DISCONNECTED' = React.useMemo(() => {
    return isConnect ? 'CONNECTED' : 'DISCONNECTED';
  }, [isConnect]);

  const onClickConnect = async () => {
    if (connectLoading) {
      return;
    }
    setConnectLoading(true);
    try {
      const account = await wallet.syncGetCurrentAccount()!;
      await wallet.requestKeyring(account?.type || '', 'unlock', null);
      getConnectStatus();
    } catch (e) {
      console.error(e);
    }
    setConnectLoading(false);
  };

  const content = React.useMemo(() => {
    return isConnect ? 'GridPlus is connected' : 'GridPlus is not connected';
  }, [isConnect]);

  return {
    content,
    onClickConnect,
    status,
    connectLoading,
  };
};
