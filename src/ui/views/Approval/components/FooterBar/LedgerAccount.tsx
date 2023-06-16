import React from 'react';
import clsx from 'clsx';
import { WALLET_BRAND_CONTENT } from '@/constant';
import { CommonAccount } from './CommonAccount';
import { useLedgerStatus } from '@/ui/component/ConnectStatus/useLedgerStatus';

const LegerIcon = WALLET_BRAND_CONTENT.LEDGER.icon;

export const LedgerAccount: React.FC = () => {
  const { status, onClickConnect } = useLedgerStatus();

  const signal = React.useMemo(() => {
    switch (status) {
      case undefined:
      case 'DISCONNECTED':
        return 'DISCONNECTED';

      default:
        return 'CONNECTED';
    }
  }, [status]);

  const TipContent = () => {
    switch (status) {
      case 'DISCONNECTED':
        return (
          <div className="flex justify-between w-full">
            <div className="text-red-forbidden">Ledger is not connected</div>
            <div
              onClick={onClickConnect}
              className={clsx('underline cursor-pointer', 'text-13 text-black')}
            >
              Connect
            </div>
          </div>
        );

      default:
        return <div className="text-black">Ledger is connected</div>;
    }
  };

  return (
    <CommonAccount signal={signal} icon={LegerIcon} tip={<TipContent />} />
  );
};
