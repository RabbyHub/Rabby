import React from 'react';
import { useMemoizedFn } from 'ahooks';
import { useInterval } from 'react-use';
import { getOneKeyDevices } from '@/ui/utils/onekey';

type ConnectStatus = 'CONNECTED' | 'DISCONNECTED';

interface UseOneKeyStatusOptions {
  enabled?: boolean;
  pollingInterval?: number;
}

export const useOneKeyStatus = (options: UseOneKeyStatusOptions = {}) => {
  const { enabled = true, pollingInterval = 2000 } = options;
  const [isConnected, setIsConnected] = React.useState(false);

  const checkStatus = useMemoizedFn(async () => {
    try {
      const devices = await getOneKeyDevices();
      const connected = devices.length > 0;
      setIsConnected(connected);
      return connected;
    } catch {
      setIsConnected(false);
      return false;
    }
  });

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    checkStatus();
  }, [checkStatus, enabled]);

  useInterval(
    () => {
      checkStatus();
    },
    enabled ? pollingInterval : null
  );

  const status: ConnectStatus = React.useMemo(() => {
    return isConnected ? 'CONNECTED' : 'DISCONNECTED';
  }, [isConnected]);

  return {
    status,
    checkStatus,
  };
};
