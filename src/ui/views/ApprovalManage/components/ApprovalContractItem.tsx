import { NameAndAddress } from '@/ui/component';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import clsx from 'clsx';
import React, { MouseEventHandler, useMemo } from 'react';
import { useEffect, useRef } from 'react';
import IconUnknown from 'ui/assets/icon-unknown-1.svg';
import { ReactComponent as IconArrowRight } from 'ui/assets/approval-management/right.svg';
import { Alert } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { openInTab, splitNumberByStep } from '@/ui/utils';
import { CHAINS } from '@debank/common';
import { ReactComponent as IconExternalLink } from 'ui/assets/open-external-gray.svg';

import { ApprovalItem } from '@/utils/approval';
import { findChain } from '@/utils/chain';

type Props = {
  data: ApprovalItem[];
  index: number;
  setSize?: (i: number, h: number) => void;
  onClick?: (item: ApprovalItem) => void;
  showNFTAmount?: boolean;
};

export const ApprovalContractItem = ({
  data,
  index,
  setSize,
  onClick: onSelect,
  showNFTAmount = false,
}: Props) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const item = data[index];

  const handleClick: MouseEventHandler<HTMLDivElement> = (e) => {
    if ((e.target as HTMLElement)?.id !== 'copyIcon') {
      onSelect?.(item);
    }
  };

  const title = useMemo(() => {
    if (item.type === 'token') {
      return splitNumberByStep(item.balance.toFixed(2));
    }
    return item?.name;
  }, [item.type]);

  const desc = useMemo(() => {
    if (item.type === 'contract') {
      return (
        <NameAndAddress
          address={item.id}
          chainEnum={
            findChain({
              serverId: item.chain,
            })?.enum
          }
          openExternal
        />
      );
    }
    if (item.type === 'token') {
      return item.name;
    }
    if (item.nftContract) {
      const chain = item.chain;
      const scanLink = findChain({
        serverId: chain,
      })?.scanLink?.replace('/tx/_s_', '');
      return (
        <div className="flex items-center text-r-neutral-body">
          <span
            className="flex items-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              !!scanLink &&
                openInTab(
                  `${scanLink}/address/${item.nftContract?.contract_id}`
                );
            }}
          >
            <span>Collection</span>
            <IconExternalLink
              width={14}
              height={14}
              viewBox="0 0 14 14"
              className="ml-[4px] text-r-neutral-body"
            />
          </span>

          <span
            className={clsx(
              'ml-[6px] text-12 text-white bg-blue-light  rounded-[2px]',
              !showNFTAmount && 'hidden'
            )}
            style={{
              padding: '1px 4px',
            }}
          >
            You currently have{' '}
            {item?.nftContract?.amount || item?.nftToken?.amount}
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center">
        <span>NFT</span>{' '}
        <span
          className={clsx(
            'ml-[6px] text-12 text-white bg-blue-light  rounded-[2px]',
            !showNFTAmount && 'hidden'
          )}
          style={{
            padding: '1px 4px',
          }}
        >
          You currently have {item?.nftToken?.amount}
        </span>
      </div>
    );
  }, [item.type]);

  const risky = useMemo(() => ['danger', 'warning'].includes(item.risk_level), [
    item.risk_level,
  ]);

  useEffect(() => {
    if (risky && setSize && rowRef.current?.getBoundingClientRect) {
      setSize(index, rowRef.current.getBoundingClientRect().height);
    }
  }, [item, setSize, index]);

  return (
    <div
      ref={rowRef}
      className={clsx(
        'bg-white mb-[12px] rounded-[6px] border border-transparent',
        onSelect &&
          'hover:border-blue-light hover:bg-blue-light hover:bg-opacity-[0.1] cursor-pointer'
      )}
      key={item.id + item.chain}
      onClick={handleClick}
    >
      <div
        className={clsx(
          'token-approval-item px-[16px] pt-[11px] pb-[10px] hover:bg-transparent hover:border-transparent',
          !onSelect && 'cursor-auto'
        )}
      >
        <IconWithChain
          width="32px"
          height="32px"
          hideConer
          iconUrl={item?.logo_url || IconUnknown}
          chainServerId={item.chain}
          noRound={item.type === 'nft'}
        />

        <div className="ml-2">
          <div
            className={clsx('token-approval-item-title', {
              'text-15': item.type === 'token',
            })}
          >
            {title}
          </div>
          <div
            className={clsx('token-approval-item-desc', {
              'text-13': item.type === 'token',
            })}
          >
            {desc}
          </div>
        </div>

        <span className="text-[13px] text-r-neutral-body ml-auto ">
          {item.list.length}{' '}
          {!onSelect && 'Approval' + (item.list.length > 1 ? 's' : '')}
          {}
        </span>
        {onSelect && <IconArrowRight />}
      </div>
      {risky && (
        <div className="pb-[12px]">
          <Alert
            className={clsx(
              'mx-[16px]  rounded-[4px] px-[8px] py-[3px]',
              item.risk_level === 'danger' ? 'bg-[#ec5151]' : 'bg-orange'
            )}
            icon={
              <InfoCircleOutlined className="text-white pt-[4px] self-start" />
            }
            banner
            message={
              <span className="text-12 text-white">{item.risk_alert}</span>
            }
            type={'error'}
          />
        </div>
      )}
    </div>
  );
};
