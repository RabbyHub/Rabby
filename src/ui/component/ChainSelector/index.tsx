import React, { useState } from 'react';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { SvgIconArrowDown } from 'ui/assets';
import Modal from './Modal';

import './style.less';

interface ChainSelectorProps {
  value: CHAINS_ENUM;
  onChange(value: CHAINS_ENUM): void;
  direction?: 'top' | 'bottom';
  connection?: boolean;
}

const ChainSelector = ({
  value,
  onChange,
  connection = false,
}: ChainSelectorProps) => {
  const [showSelectorModal, setShowSelectorModal] = useState(false);

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
      <div className="chain-selector" onClick={handleClickSelector}>
        <img src={CHAINS[value]?.logo} className="chain-logo" />
        <SvgIconArrowDown className="icon icon-arrow-down text-gray-content fill-current" />
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
