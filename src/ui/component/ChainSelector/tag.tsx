import React, { useState } from 'react';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { SvgIconArrowDownTriangle } from 'ui/assets';
import Modal from './Modal';

import './style.less';

interface ChainSelectorProps {
  value: CHAINS_ENUM;
  onChange(value: CHAINS_ENUM): void;
  direction?: 'top' | 'bottom';
}

const ChainSelector = ({ value, onChange }: ChainSelectorProps) => {
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
      <div className="chain-tag-selector flex" onClick={handleClickSelector}>
        On{' '}
        <span className="chain-tag-selector__name flex-1">
          {CHAINS[value].name}
        </span>
        <SvgIconArrowDownTriangle className="icon icon-arrow-down" />
      </div>
      <Modal
        value={value}
        visible={showSelectorModal}
        onChange={handleChange}
        onCancel={handleCancel}
      />
    </>
  );
};

export default ChainSelector;
