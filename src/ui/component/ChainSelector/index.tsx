import React, { useState } from 'react';
import { CHAINS_ENUM, CHAINS } from 'consts';
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
        className={clsx('chain-selector', className)}
        onClick={handleClickSelector}
      >
        <img src={CHAINS[value]?.selectChainLogo} className="chain-logo" />
        {CHAINS[value]?.name}
        <SvgIconArrowDown
          className={clsx('icon icon-arrow-down fill-current arrowColor')}
        />
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
