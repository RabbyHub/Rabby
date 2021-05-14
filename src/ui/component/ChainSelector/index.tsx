import React from 'react';
import { Popover } from 'antd';
import { CHAINS_ENUM, CHAINS } from 'consts';
import IconChecked from 'ui/assets/checked.svg';
import IconNotChecked from 'ui/assets/not-checked.svg';
import IconArrowDown from 'ui/assets/arrow-down-gray.svg';
import './style.less';

interface ChainSelectorProps {
  value: CHAINS_ENUM;
  onChange(value: CHAINS_ENUM): void;
  direction?: 'top' | 'bottom';
}

const ChainSelector = ({
  value,
  onChange,
  direction = 'top',
}: ChainSelectorProps) => {
  const Options = (
    <ul className="chain-selector-options">
      {Object.keys(CHAINS).map((key) => (
        <li key={key} onClick={() => onChange(CHAINS[key].enum as CHAINS_ENUM)}>
          <img className="chain-logo" src={CHAINS[key].logo} />
          <span className="chain-name">{CHAINS[key].name}</span>
          <img
            className="icon icon-checked"
            src={value.toString() === key ? IconChecked : IconNotChecked}
          />
        </li>
      ))}
    </ul>
  );
  return (
    <Popover
      content={Options}
      overlayClassName="chain-selector-popover"
      trigger="click"
    >
      <div className="chain-selector">
        <img src={CHAINS[value].logo} className="chain-logo" />
        <img src={IconArrowDown} className="icon icon-arrow-down" />
      </div>
    </Popover>
  );
};

export default ChainSelector;
