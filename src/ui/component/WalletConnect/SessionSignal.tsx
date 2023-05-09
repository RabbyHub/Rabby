import React from 'react';
import { useSessionStatus } from './useSessionStatus';
import clsx from 'clsx';
import { useSessionChainId } from './useSessionChainId';

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
    if (chainId && chainId !== sessionChainId && status === 'CONNECTED') {
      return 'bg-orange';
    }

    switch (status) {
      case 'ACCOUNT_ERROR':
      case 'BRAND_NAME_ERROR':
        return 'bg-orange';

      case undefined:
      case 'DISCONNECTED':
      case 'RECEIVED':
      case 'REJECTED':
        return 'bg-gray-comment';

      default:
        return 'bg-green';
    }
  }, [status, chainId, sessionChainId]);

  return (
    <div
      className={clsx(
        'rounded-full',
        {
          'w-[6px] h-[6px]': size === 'small',
          'w-[8px] h-[8px]': size === 'normal',
          'right-[-2px] bottom-[-2px] absolute': isBadge,
        },
        'border border-white',
        bgColor,
        className
      )}
    />
  );
};
