import { NameAndAddress } from '@/ui/component';
import { PendingTxItem } from '@rabby-wallet/rabby-api/dist/types';
import clsx from 'clsx';
import React from 'react';
import IconUser from 'ui/assets/address-management.svg';
import IconUnknown from 'ui/assets/icon-unknown.svg';
import { getActionTypeTextByType } from '../../../Approval/components/Actions/utils';

export const TransactionAction = ({ data }: { data: PendingTxItem }) => {
  const protocol = data.to_addr_desc?.protocol;

  const isSend = data?.action_type === 'send_token';

  const icon =
    data?.action_type === 'send_token'
      ? IconUser
      : protocol?.logo_url || IconUnknown;

  return (
    <div className="flex items-center gap-[12px]">
      <img
        src={icon}
        alt=""
        className={clsx(
          'flex-shrink-0 w-[32px] h-[32px]',
          isSend ? '' : 'rounded-full'
        )}
      />{' '}
      <div className="min-w-0">
        <div className="text-r-neutral-title-1 font-medium mb-[4px]">
          {getActionTypeTextByType(data.action_type)}
        </div>
        <div className="text-r-neutral-body">
          {protocol?.name ? (
            <>{protocol?.name}</>
          ) : (
            <NameAndAddress
              className="justify-start text-r-neutral-body"
              addressClass="text-r-neutral-body text-[13px]"
              address={data.to_addr}
              copyIcon={false}
            />
          )}
        </div>
      </div>
    </div>
  );
};
