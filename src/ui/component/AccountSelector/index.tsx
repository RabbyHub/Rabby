import React, { ReactNode, useEffect, useState } from 'react';
import { CHAINS_ENUM } from 'consts';
import { useHover, useWallet } from 'ui/utils';
import { ReactComponent as ArrowDownSVG } from '@/ui/assets/dashboard/arrow-down.svg';
import ChainSelectorModal from './Modal';
import ChainIcon from '../ChainIcon';

import './style.less';
import clsx from 'clsx';
import { findChainByEnum } from '@/utils/chain';
import { ChainSelectorPurpose } from '@/ui/hooks/useChain';
import { Account } from '@/background/service/preference';
import { AccountSelectorModal } from './AccountSelectorModal';

interface Props {
  value?: Account;
  onChange(value: Account): void;
  className?: string;
  title?: ReactNode;
  onAfterOpen?: () => void;
  showRPCStatus?: boolean;
  modalHeight?: number;
}

export const AccountSelector = ({
  title,
  value,
  onChange,
  className = '',
  onAfterOpen,
  showRPCStatus = false,
  modalHeight,
}: Props) => {
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [isHovering, hoverProps] = useHover();
  const [customRPC, setCustomRPC] = useState('');
  const wallet = useWallet();

  const handleClickSelector = () => {
    setShowSelectorModal(true);
    onAfterOpen?.();
  };

  const handleCancel = () => {
    setShowSelectorModal(false);
  };

  const handleChange = (value: Account) => {
    onChange(value);
    setShowSelectorModal(false);
  };

  return (
    <>
      <div
        className={clsx('chain-selector', className, isHovering && 'hover')}
        onClick={handleClickSelector}
        {...hoverProps}
      >
        <div className="mr-6"></div>
        <span className="flex-1 whitespace-nowrap overflow-hidden overflow-ellipsis"></span>
        <ArrowDownSVG className={clsx('icon')} />
      </div>
      <AccountSelectorModal
        title={title}
        value={value}
        visible={showSelectorModal}
        onChange={handleChange}
        onCancel={handleCancel}
        showRPCStatus={showRPCStatus}
        height={modalHeight}
      />
    </>
  );
};
