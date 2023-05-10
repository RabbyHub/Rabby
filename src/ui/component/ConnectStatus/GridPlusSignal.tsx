import React from 'react';
import { Signal, Props } from '../Signal';
import { useGridPlusStatus } from './useGridPlusStatus';

export const GridPlusSignal: React.FC<Omit<Props, 'color'>> = (props) => {
  const { status } = useGridPlusStatus();

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
