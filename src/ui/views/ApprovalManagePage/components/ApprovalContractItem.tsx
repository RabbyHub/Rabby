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

import { ApprovalItem } from '@/utils/approval';
import { findChainByServerID } from '@/utils/chain';

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

  const risky = useMemo(() => ['danger', 'warning'].includes(item.risk_level), [
    item.risk_level,
  ]);

  useEffect(() => {
    if (risky && setSize && rowRef.current?.getBoundingClientRect) {
      setSize(index, rowRef.current.getBoundingClientRect().height);
    }
  }, [item, setSize, index]);

  const chainItem = useMemo(() => findChainByServerID(item.chain), [
    item.chain,
  ]);

  return (
    <div
      ref={rowRef}
      className={clsx(
        'bg-white mb-[12px] rounded-[6px] border border-transparent contract-approval-item',
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
          width="16px"
          height="16px"
          hideConer
          hideChainIcon
          iconUrl={chainItem?.logo || IconUnknown}
          chainServerId={item.chain}
          noRound={item.type === 'nft'}
        />

        <div className="ml-2 flex">
          <div
            className={clsx('token-approval-item-desc', {
              'text-13': item.type === 'token',
            })}
          >
            <NameAndAddress.SafeCopy
              addressClass="spender-address font-medium"
              address={item.id}
              chainEnum={chainItem?.enum}
              addressSuffix={
                <span className="contract-name ml-[4px]">
                  ({item.name || 'Unknown'})
                </span>
              }
              openExternal={false}
            />
          </div>
        </div>

        <span className="text-[13px] text-gray-subTitle flex-shrink-0 ml-auto font-medium">
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
