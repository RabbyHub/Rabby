import React from 'react';
import { useLedgerStatus } from './useLedgerStatus';
import { Signal, Props } from '../Signal';

export const LedgerSignal: React.FC<Omit<Props, 'color'>> = (props) => {
  const { status } = useLedgerStatus();

  const signalColor = React.useMemo(() => {
    switch (status) {
      case undefined:
      case 'DISCONNECTED':
        return 'gray';

      default:
        return 'green';
    }
  }, [status]);

  return <Signal {...props} className="mt-[7px]" color={signalColor} />;
};
