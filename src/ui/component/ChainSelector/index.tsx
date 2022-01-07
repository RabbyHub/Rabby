import React, { useState } from 'react';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { useHover } from 'ui/utils';
import { SvgIconArrowDown } from 'ui/assets';
import Modal from './Modal';

import './style.less';
import { chain } from 'lodash';
import clsx from 'clsx';

interface ChainSelectorProps {
  value: CHAINS_ENUM;
  onChange(value: CHAINS_ENUM): void;
  direction?: 'top' | 'bottom';
  connection?: boolean;
  showModal?: boolean;
  className?: string;
}

const ChainSelector = ({
  value,
  onChange,
  connection = false,
  showModal = false,
  className = '',
}: ChainSelectorProps) => {
  const [showSelectorModal, setShowSelectorModal] = useState(showModal);
  const [isHovering, hoverProps] = useHover();

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
        <img src={CHAINS[value]?.selectChainLogo} className="chain-logo" />
        {CHAINS[value]?.name}
        <SvgIconArrowDown className={clsx('icon icon-arrow-down arrowColor')} />
      </div>
      <Modal
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
