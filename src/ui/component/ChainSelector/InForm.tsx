import React, { InsHTMLAttributes, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { CHAINS, CHAINS_ENUM } from '@debank/common';

import { useState } from 'react';
import { SelectChainListProps } from '@/ui/component/ChainSelector/components/SelectChainList';
import ChainSelectorModal from '@/ui/component/ChainSelector/Modal';
import { ChainSelectorPurpose } from '@/ui/hooks/useChain';
import styled from 'styled-components';
import ChainIcon from '@/ui/component/ChainIcon';
import ImgArrowDown, {
  ReactComponent as RcImgArrowDown,
} from '@/ui/assets/swap/arrow-down.svg';
import { useWallet } from '@/ui/utils';
import { SWAP_SUPPORT_CHAINS } from '@/constant';
import { findChain } from '@/utils/chain';

const ChainWrapper = styled.div`
  height: 40px;
  background: var(--r-neutral-card-2, #f2f4f7);
  border-radius: 6px;
  padding: 12px 10px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  &:hover {
    background: rgba(134, 151, 255, 0.2);
  }
  & > {
    .down {
      margin-left: auto;
      width: 20px;
      height: 20px;
    }
    .name {
      color: var(--r-neutral-title-1, #192945);
    }
  }
`;

export const ChainRender = ({
  chain,
  readonly,
  className,
  ...other
}: {
  chain: CHAINS_ENUM;
  readonly: boolean;
} & InsHTMLAttributes<HTMLDivElement>) => {
  const wallet = useWallet();

  const chainInfo = useMemo(() => {
    return findChain({ enum: chain });
  }, [chain]);
  const [customRPC, setCustomRPC] = useState('');
  const getCustomRPC = async () => {
    const rpc = await wallet.getCustomRpcByChain(chain);
    setCustomRPC(rpc?.enable ? rpc.url : '');
  };
  useEffect(() => {
    getCustomRPC();
  }, [chain]);
  return (
    <ChainWrapper
      className={clsx(
        {
          'cursor-default hover:bg-r-neutral-bg-2': readonly,
        },
        className
      )}
      {...other}
    >
      {/* <img className="logo" src={CHAINS[chain].logo} alt={CHAINS[chain].name} /> */}
      <ChainIcon
        chain={chain}
        customRPC={customRPC}
        size="small"
        showCustomRPCToolTip
      />
      <span className="name">{chainInfo?.name}</span>
      {/* {!readonly && <img className="down" src={ImgArrowDown} alt="" />} */}
      {!readonly && <RcImgArrowDown className="down" />}
    </ChainWrapper>
  );
};

interface ChainSelectorProps {
  value: CHAINS_ENUM;
  onChange?(value: CHAINS_ENUM): void;
  readonly?: boolean;
  showModal?: boolean;
  direction?: 'top' | 'bottom';
  supportChains?: SelectChainListProps['supportChains'];
  disabledTips?: SelectChainListProps['disabledTips'];
  title?: React.ReactNode;
}
export default function ChainSelectorInForm({
  value,
  onChange,
  readonly = false,
  showModal = false,
  disabledTips,
  title,
  supportChains,
}: ChainSelectorProps) {
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

  return (
    <>
      <ChainRender
        chain={value}
        onClick={handleClickSelector}
        readonly={readonly}
      />
      {!readonly && (
        <ChainSelectorModal
          value={value}
          visible={showSelectorModal}
          onChange={handleChange}
          onCancel={handleCancel}
          supportChains={supportChains}
          disabledTips={disabledTips}
          title={title}
        />
      )}
    </>
  );
}
