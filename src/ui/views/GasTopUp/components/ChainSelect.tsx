import React, { useState } from 'react';
import styled from 'styled-components';
import { ReactComponent as SvgIconArrowDownTriangle } from '@/ui/assets/swap/arrow-caret-down.svg';
import Modal from '@/ui/component/ChainSelector/Modal';
import { CHAINS, CHAINS_ENUM } from '@/constant';
import {
  findChainByEnum,
  findChainByServerID,
  getChainList,
} from '@/utils/chain';
import { SelectChainItemProps } from '@/ui/component/ChainSelector/components/SelectChainItem';

const allMainnetChainEnums = getChainList('mainnet').map((item) => item.enum);

export const ChainWrapper = styled.div`
  background: var(--r-neutral-card-2);
  border-radius: 4px;
  padding: 16px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  border: 1px solid transparent;

  &:hover {
    border-color: var(--r-blue-default, #7084ff);
  }

  & .icon {
    width: 32px;
    height: 32px;
    border-radius: 9999px;
    margin-right: 12px;
  }
  & .text {
    font-weight: 500;
    font-size: 20px;
    line-height: 23px;
    color: var(--r-neutral-title-1);
  }
`;

const getDisabledTips: SelectChainItemProps['disabledTips'] = (ctx) => {
  const chainItem = findChainByServerID(ctx.chain.serverId);

  if (chainItem?.isTestnet) return 'Custom network is not supported';

  return 'Coming Soon';
};

interface ChainSelectProps {
  value: CHAINS_ENUM;
  onChange?(value: CHAINS_ENUM): void;
  readonly?: boolean;
  showModal?: boolean;
  direction?: 'top' | 'bottom';
}
export const ChainSelect = ({
  value,
  onChange,
  readonly = false,
  showModal = false,
}: ChainSelectProps) => {
  const [showSelectorModal, setShowSelectorModal] = useState(showModal);

  const handleClickSelector = () => {
    if (readonly) return;
    setShowSelectorModal(true);
  };

  const handleCancel = () => {
    if (readonly) return;
    setShowSelectorModal(false);
  };

  const handleChange = (value: CHAINS_ENUM) => {
    if (readonly) return;
    onChange && onChange(value);
    setShowSelectorModal(false);
  };

  const chainItem = findChainByEnum(value);

  return (
    <>
      <ChainWrapper onClick={handleClickSelector}>
        <div className="flex items-center justify-center">
          <img
            className="icon ml-[4px] mr-[12px]"
            src={chainItem?.logo || ''}
          />
          <span className="text">{chainItem?.name || ''}</span>
        </div>
        {!readonly && (
          <SvgIconArrowDownTriangle
            width={24}
            height={24}
            className="text-r-neutral-foot"
          />
        )}
      </ChainWrapper>
      {!readonly && (
        <Modal
          value={value}
          visible={showSelectorModal}
          onChange={handleChange}
          onCancel={handleCancel}
          disabledTips={getDisabledTips}
          supportChains={allMainnetChainEnums}
        />
      )}
    </>
  );
};
