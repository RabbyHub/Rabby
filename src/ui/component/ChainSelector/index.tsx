import React, { useState } from 'react';
import { Modal } from 'antd';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { useWallet } from 'ui/utils';
import IconChecked from 'ui/assets/checked.svg';
import IconNotChecked from 'ui/assets/not-checked.svg';
import { IconArrowDown } from 'ui/assets';
import './style.less';

interface ChainSelectorProps {
  value: CHAINS_ENUM;
  onChange(value: CHAINS_ENUM): void;
  direction?: 'top' | 'bottom';
}

const ChainSelector = ({ value, onChange }: ChainSelectorProps) => {
  const wallet = useWallet();
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [enableChains] = useState(wallet.getEnableChains());

  const handleClickSelector = () => {
    setShowSelectorModal(true);
  };

  const handleCancel = () => {
    setShowSelectorModal(false);
  };

  const handleChange = (val: CHAINS_ENUM) => {
    setShowSelectorModal(false);
    onChange(val);
  };

  return (
    <>
      <div className="chain-selector" onClick={handleClickSelector}>
        <img src={CHAINS[value].logo} className="chain-logo" />
        <IconArrowDown className="icon icon-arrow-down text-gray-content fill-current" />
      </div>
      <Modal
        width="86%"
        closable={false}
        visible={showSelectorModal}
        footer={null}
        onCancel={handleCancel}
        className="chain-selector__modal"
      >
        <>
          <ul className="chain-selector-options">
            {enableChains.map((chain) => (
              <li
                key={chain.enum}
                onClick={() => handleChange(chain.enum as CHAINS_ENUM)}
              >
                <img className="chain-logo" src={chain.logo} />
                <span className="chain-name">{chain.name}</span>
                <img
                  className="icon icon-checked"
                  src={value === chain.enum ? IconChecked : IconNotChecked}
                />
              </li>
            ))}
          </ul>
          <p className="text-12 text-gray-comment text-center mb-0 tip">
            More chains will be added in the future...
          </p>
        </>
      </Modal>
    </>
  );
};

export default ChainSelector;
