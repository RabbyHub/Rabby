import { Dropdown, Menu } from 'antd';
import React from 'react';
import IconArrowDown from 'ui/assets/arrow-down-white.svg';
import IconChecked from 'ui/assets/checked-1.svg';
import { SvgIconArrowDownTriangle } from 'ui/assets';

const options = [
  {
    label: 'Collections',
    value: 'collection',
  },
  {
    label: 'All NFTs',
    value: 'nft',
  },
];

interface NFTDropdownProps {
  value: 'collection' | 'nft';
  onChange: (val: NFTDropdownProps['value']) => void;
}

const NFTDropdown = ({ value, onChange }: NFTDropdownProps) => {
  const current =
    options.find((option) => option.value === value) || options[0];

  const menu = (
    <Menu
      className="rabby-dropdown-menu"
      onClick={(e) => onChange(e.key as NFTDropdownProps['value'])}
    >
      {options.map((option) => (
        <Menu.Item key={option.value} className="rabby-dropdown-menu-item">
          <div className="rabby-dropdown-menu-item-icon">
            {value === option.value && <img src={IconChecked} alt="" />}
          </div>
          <div className="rabby-dropdown-menu-item-label">{option.label}</div>
        </Menu.Item>
      ))}
    </Menu>
  );
  return (
    <Dropdown
      className="rabby-dropdown"
      overlay={menu}
      placement="bottomRight"
      trigger={['click']}
    >
      <div className="rabby-dropdown-current pointer">
        {current?.label} <img src={IconArrowDown} className="ml-2" />
      </div>
    </Dropdown>
  );
};

export default NFTDropdown;
