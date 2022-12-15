import React, { ReactNode, useEffect, useState } from 'react';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { useHover, useWallet } from 'ui/utils';
import { SvgIconArrowDown } from 'ui/assets';
import Modal from './Modal';
import ChainIcon from '../ChainIcon';

import './style.less';
import clsx from 'clsx';

interface ChainSelectorProps {
  value: CHAINS_ENUM;
  onChange(value: CHAINS_ENUM): void;
  direction?: 'top' | 'bottom';
  connection?: boolean;
  showModal?: boolean;
  className?: string;
  title?: ReactNode;
}

const ChainSelector = ({
  title,
  value,
  onChange,
  connection = false,
  showModal = false,
  className = '',
}: ChainSelectorProps) => {
  const [showSelectorModal, setShowSelectorModal] = useState(showModal);
  const [isHovering, hoverProps] = useHover();
  const [customRPC, setCustomRPC] = useState('');
  const wallet = useWallet();

  const handleClickSelector = () => {
    setShowSelectorModal(true);
  };

  const handleCancel = () => {
    setShowSelectorModal(false);
  };

  const handleChange = (value: CHAINS_ENUM) => {
    onChange(value);
    setShowSelectorModal(false);
  };

  const getCustomRPC = async () => {
    const rpc = await wallet.getCustomRpcByChain(value);
    setCustomRPC(rpc);
  };

  useEffect(() => {
    getCustomRPC();
  }, [value]);

  return (
    <>
      <div
        className={clsx(
          'chain-selector',
          className,
          !className && isHovering && 'hover'
        )}
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
        {CHAINS[value]?.name}
        <SvgIconArrowDown className={clsx('icon icon-arrow-down arrowColor')} />
      </div>
      <Modal
        title={title}
        value={value}
        visible={showSelectorModal}
        onChange={handleChange}
        onCancel={handleCancel}
        connection={connection}
      />
    </>
  );
};

export default ChainSelector;
