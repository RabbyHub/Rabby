import { Copy, NameAndAddress } from '@/ui/component';
import { PendingTxItem } from '@rabby-wallet/rabby-api/dist/types';
import clsx from 'clsx';
import React from 'react';
import IconUser from 'ui/assets/address-management.svg';
import IconContract from 'ui/assets/pending/icon-contract.svg';
import { getActionTypeTextByType } from '../../../Approval/components/Actions/utils';
import { Popover } from 'antd';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { ReactComponent as RcIconCopy } from '@/ui/assets/pending/icon-copy-1.svg';
import { ellipsisAddress } from '@/ui/utils/address';
import { copyAddress } from '@/ui/utils/clipboard';

export const TransactionAction = ({ data }: { data: PendingTxItem }) => {
  const protocol = data.to_addr_desc?.protocol;

  const isSend = data?.action_type === 'send_token';

  const icon =
    data?.action_type === 'send_token'
      ? IconUser
      : protocol?.logo_url || IconContract;

  return (
    <div className="flex items-center gap-[12px]">
      <img
        src={icon}
        alt=""
        className={clsx(
          'flex-shrink-0 w-[24px] h-[24px]',
          isSend || !protocol?.logo_url ? '' : 'rounded-full'
        )}
      />{' '}
      <div className="min-w-0">
        {protocol?.name || data?.to_addr ? (
          <div className="text-r-neutral-title-1 font-medium">
            {protocol?.name ? (
              <Popover
                overlayInnerStyle={{
                  padding: '0 -4px',
                }}
                content={
                  <div>
                    <div className="text-r-neutral-title-1 mb-[6px] text-[13px] leading-[16px] font-medium">
                      {protocol?.name}
                    </div>
                    <div className="flex items-center text-r-neutral-body gap-[4px] text-[12px] leading-[14px]">
                      {data.to_addr}
                      <ThemeIcon
                        src={RcIconCopy}
                        className="cursor-pointer"
                        onClick={() => {
                          copyAddress(data.to_addr);
                        }}
                      />
                    </div>
                  </div>
                }
              >
                <div>{protocol?.name}</div>
              </Popover>
            ) : data?.to_addr ? (
              <Popover
                overlayInnerStyle={{
                  padding: '0 -4px',
                }}
                content={
                  <div className="flex items-center text-r-neutral-body gap-[4px] text-[12px] leading-[14px]">
                    {data.to_addr}{' '}
                    <ThemeIcon
                      src={RcIconCopy}
                      className="cursor-pointer"
                      onClick={() => {
                        copyAddress(data.to_addr);
                      }}
                    />
                  </div>
                }
              >
                <div className="text-r-neutral-title-1 text-[13px] font-medium">
                  {ellipsisAddress(data.to_addr)}
                </div>
              </Popover>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};
