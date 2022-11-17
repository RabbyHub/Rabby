import {
  NFTApproval,
  NFTApprovalContract,
  Spender,
  TokenApproval,
} from '@/background/service/openapi';
import { NameAndAddress } from '@/ui/component';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import clsx from 'clsx';
import React, { MouseEventHandler } from 'react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import IconUnknown from 'ui/assets/icon-unknown-1.svg';
import { ReactComponent as IconArrowRight } from 'ui/assets/arrow-right-gray.svg';
import { Alert } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

export type ApprovalItem = Spender & {
  list: (NFTApprovalContract | NFTApproval | TokenApproval)[];
  chain: string;
};
export const ApprovalContractItem = ({
  data,
  index,
  setSize,
  onClick: onSelect,
}: {
  data: ApprovalItem[];
  index: number;
  setSize?: (i: number, h: number) => void;
  onClick?: (item: ApprovalItem) => void;
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const { t } = useTranslation();
  const item = data[index];

  const handleClick: MouseEventHandler<HTMLDivElement> = (e) => {
    if ((e.target as HTMLElement)?.id !== 'copyIcon') {
      onSelect?.(item);
    }
  };

  useEffect(() => {
    if (
      item.risk_level !== 'safe' &&
      setSize &&
      rowRef.current?.getBoundingClientRect
    ) {
      setSize(index, rowRef.current.getBoundingClientRect().height);
    }
  }, [item.risk_level, setSize, index]);

  return (
    <div
      ref={rowRef}
      className={clsx(
        'bg-white mb-[12px] rounded-[6px] border border-transparent',
        onSelect &&
          'hover:border-blue-light hover:bg-blue-light hover:bg-opacity-[0.1] cursor-pointer'
      )}
      key={item.id + item.list[0].chain}
      onClick={handleClick}
    >
      <div
        className={clsx(
          'token-approval-item px-[16px] py-[14px] hover:bg-transparent hover:border-transparent',
          !onSelect && 'cursor-auto'
        )}
      >
        <IconWithChain
          width="32px"
          height="32px"
          hideConer
          iconUrl={item?.protocol?.logo_url || IconUnknown}
          chainServerId={item?.protocol?.chain || item.list[0].chain}
        />

        <div className="ml-2">
          <div className="token-approval-item-title ">
            {item.protocol?.name || t('Unknown Contract')}
          </div>
          <div className="token-approval-item-desc">
            <NameAndAddress address={item.id} />
          </div>
        </div>

        {onSelect && (
          <IconArrowRight
            width={20}
            height={20}
            viewBox="0 0 12 12"
            className="token-approval-item-arrow ml-auto"
          />
        )}
      </div>
      {item.risk_level !== 'safe' && (
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
