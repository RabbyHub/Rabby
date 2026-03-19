import React from 'react';
import { Dropdown, Menu, Tooltip } from 'antd';

interface PerpsDropdownOption {
  key: string;
  label: React.ReactNode;
  title?: string;
}

interface PerpsDropdownProps {
  options: PerpsDropdownOption[];
  onSelect: (key: string) => void;
  children: React.ReactNode;
  placement?:
    | 'bottomLeft'
    | 'bottomRight'
    | 'bottomCenter'
    | 'topLeft'
    | 'topRight'
    | 'topCenter';
}

export const PerpsDropdown: React.FC<PerpsDropdownProps> = ({
  options,
  onSelect,
  children,
  placement,
}) => {
  return (
    <Dropdown
      forceRender={true}
      transitionName=""
      placement={placement}
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
              {option.title ? (
                <Tooltip
                  title={option.title}
                  // prefixCls="perps-slider-tip"
                  placement="topRight"
                  overlayClassName="rectangle"
                >
                  <span className="block">{option.label}</span>
                </Tooltip>
              ) : (
                option.label
              )}
            </Menu.Item>
          ))}
        </Menu>
      }
    >
      {children}
    </Dropdown>
  );
};
