import React from 'react';
import { useSessionStatus } from './useSessionStatus';
import { useSessionChainId } from './useSessionChainId';
import { Signal } from '../Signal';

interface Props {
  size?: 'small' | 'normal';
  isBadge?: boolean;
  address: string;
  brandName: string;
  className?: string;
  pendingConnect?: boolean;
  chainId?: number;
}

export const SessionSignal: React.FC<Props> = ({
  size = 'normal',
  isBadge,
  address,
  brandName,
  className,
  pendingConnect,
  chainId,
}) => {
  const { status } = useSessionStatus(
    {
      address,
      brandName,
    },
    pendingConnect
  );
  const sessionChainId = useSessionChainId({
    address,
    brandName,
  });

  const bgColor = React.useMemo(() => {
    // if (chainId && chainId !== sessionChainId && status === 'CONNECTED') {
    //   return 'orange';
    // }

    switch (status) {
      case 'ACCOUNT_ERROR':
      case 'BRAND_NAME_ERROR':
        return 'orange';

      case undefined:
      case 'DISCONNECTED':
      case 'RECEIVED':
      case 'REJECTED':
        return 'gray';

      default:
        return 'green';
    }
  }, [status, chainId, sessionChainId]);

  return (
    <Signal
      className={className}
      size={size}
      isBadge={isBadge}
      color={bgColor}
    />
  );
};
