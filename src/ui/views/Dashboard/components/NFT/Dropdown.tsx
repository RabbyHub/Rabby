import { Dropdown, Menu } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import IconArrowDown from 'ui/assets/arrow-down-white.svg';
import IconChecked from 'ui/assets/checked-1.svg';

interface NFTDropdownProps {
  value: 'collection' | 'nft';
  onChange: (val: NFTDropdownProps['value']) => void;
}

const NFTDropdown = ({ value, onChange }: NFTDropdownProps) => {
  const { t } = useTranslation();
  const options = [
    {
      label: t('page.dashboard.nft.collectionList.collections.label'),
      value: 'collection',
    },
    {
      label: t('page.dashboard.nft.collectionList.all_nfts.label'),
      value: 'nft',
    },
  ];
  const current =
    options.find((option) => option.value === value) || options[0];

  const menu = (
    <Menu
      className="rabby-dropdown-menu"
      onClick={(e) => {
        const v = e.key as NFTDropdownProps['value'];
        if (v !== value) {
          onChange(v);
        }
      }}
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
