import React from 'react';
import { Signal, Props } from '../Signal';
import { useKeystoneDeviceConnected } from '@/ui/utils/keystone';

export const KeystoneSignal: React.FC<Omit<Props, 'color'>> = (props) => {
  const isConnected = useKeystoneDeviceConnected();

  const signalColor = React.useMemo(() => {
    return isConnected ? 'green' : 'gray';
  }, [isConnected]);

  return <Signal {...props} className="mt-[7px]" color={signalColor} />;
};
