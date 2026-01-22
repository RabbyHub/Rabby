/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { CHAINS_ENUM } from 'consts';
import { useHover, useWallet } from 'ui/utils';
import { ReactComponent as ArrowDownSVG } from '@/ui/assets/dashboard/arrow-down.svg';
import ChainSelectorModal from './Modal';
import ChainIcon from '../ChainIcon';

import './style.less';
import clsx from 'clsx';
import { findChainByEnum } from '@/utils/chain';
import { Account } from '@/background/service/preference';

interface ChainSelectorProps {
  value: CHAINS_ENUM;
  onChange(value: CHAINS_ENUM): void;
  direction?: 'top' | 'bottom';
  connection?: boolean;
  showModal?: boolean;
  className?: string;
  title?: ReactNode;
  onAfterOpen?: () => void;
  showRPCStatus?: boolean;
  modalHeight?: number | string;
  account?: Account | null;
}

const ChainSelector = ({
  title,
  value,
  onChange,
  connection = false,
  showModal = false,
  className = '',
  onAfterOpen,
  showRPCStatus = false,
  modalHeight,
  account,
}: ChainSelectorProps) => {
  const [showSelectorModal, setShowSelectorModal] = useState(showModal);
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

  const handleChange = (value: CHAINS_ENUM) => {
    onChange(value);
    setShowSelectorModal(false);
  };

  const getCustomRPC = useCallback(async () => {
    const rpc = await wallet.getCustomRpcByChain(value);
    setCustomRPC(rpc?.enable ? rpc.url : '');
  }, [value, wallet]);

  useEffect(() => {
    getCustomRPC();
  }, [getCustomRPC]);

  return (
    <>
      <div
        className={clsx('chain-selector', className, isHovering && 'hover')}
        onClick={handleClickSelector}
        {...hoverProps}
      >
        <div className="mr-6">
          <ChainIcon
            chain={value}
            customRPC={customRPC}
            size="small"
            showCustomRPCToolTip
          />
        </div>
        <span className="flex-1 whitespace-nowrap overflow-hidden overflow-ellipsis">
          {findChainByEnum(value)?.name}
        </span>
        <ArrowDownSVG className={clsx('icon')} />
      </div>
      <ChainSelectorModal
        title={title}
        value={value}
        visible={showSelectorModal}
        onChange={handleChange}
        onCancel={handleCancel}
        connection={connection}
        showRPCStatus={showRPCStatus}
        height={modalHeight}
        account={account}
      />
    </>
  );
};

export default ChainSelector;
