import React from 'react';
import clsx from 'clsx';
import { WALLET_BRAND_CONTENT } from '@/constant';
import { CommonAccount } from './CommonAccount';
import { useLedgerStatus } from '@/ui/component/ConnectStatus/useLedgerStatus';
import { Account } from '@/background/service/preference';

const LegerIcon = WALLET_BRAND_CONTENT.LEDGER.icon;

interface Props {
  account: Account;
}

export const LedgerAccount: React.FC<Props> = ({ account }) => {
  const { status, onClickConnect, content, description } = useLedgerStatus(
    account.address
  );

  const tipStatus = React.useMemo(() => {
    if (status === 'DISCONNECTED' || !status) {
      return 'DISCONNECTED';
    }
    return status;
  }, [status]);

  const signal = React.useMemo(() => {
    switch (status) {
      case 'DISCONNECTED':
        return 'DISCONNECTED';
      case 'CONNECTED':
        return 'CONNECTED';
      default:
        return 'ERROR';
    }
  }, [tipStatus]);

  const TipContent = () => {
    switch (tipStatus) {
      case 'DISCONNECTED':
        return <div className="text-red-forbidden">{content}</div>;

      case 'ADDRESS_ERROR':
      case 'LOCKED':
        return (
          <div className="text-orange">
            <div>{content}</div>
            <div className="mt-12">{description}</div>
          </div>
        );

      default:
        return <div className="text-gray-subTitle">{content}</div>;
    }
  };

  return (
    <CommonAccount signal={signal} icon={LegerIcon} tip={<TipContent />}>
      <div
        onClick={onClickConnect}
        className={clsx(
          'underline cursor-pointer',
          'absolute right-0 top-[-1px]',
          'text-12 font-medium text-gray-subTitle'
        )}
      >
        {tipStatus === 'DISCONNECTED' && 'Connect'}
      </div>
    </CommonAccount>
  );
};
