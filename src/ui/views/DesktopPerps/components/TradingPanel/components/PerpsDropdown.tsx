import React from 'react';
import { Dropdown, Menu } from 'antd';

interface PerpsDropdownOption {
  key: string;
  label: React.ReactNode;
}

interface PerpsDropdownProps {
  options: PerpsDropdownOption[];
  onSelect: (key: string) => void;
  children: React.ReactNode;
}

export const PerpsDropdown: React.FC<PerpsDropdownProps> = ({
  options,
  onSelect,
  children,
}) => {
  return (
    <Dropdown
      forceRender={true}
      transitionName=""
      overlay={
        <Menu
          className="bg-rb-neutral-bg-4"
          onClick={(info) => onSelect(info.key as string)}
        >
          {options.map((option) => (
            <Menu.Item
              className="text-rb-neutral-title-1 hover:bg-rb-neutral-bg-5"
              key={option.key}
            >
              {option.label}
            </Menu.Item>
          ))}
        </Menu>
      }
    >
      {children}
    </Dropdown>
  );
};
