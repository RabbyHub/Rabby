import React from 'react';
import { Dropdown, Menu } from 'antd';
import { PerpsTooltip } from '../../PerpsTooltip';

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

// Menu sits 2px under its trigger (Figma 165065:93924); antd's default is 4px.
export const PERPS_DROPDOWN_ALIGN = { offset: [0, 2] as [number, number] };
export const PERPS_DROPDOWN_MENU_CLASS = 'desktop-perps-dropdown-menu';
// Compact text trigger from the same Figma node: 24px tall, 6px side padding
// (5px + the 1px border), borderless until hovered or open. antd tags the
// trigger with `ant-dropdown-open` while its menu is showing.
export const PERPS_DROPDOWN_TRIGGER_CLASS = [
  'inline-flex items-center gap-[3px] h-[24px] px-[5px] rounded-[6px] cursor-pointer',
  'border border-solid border-transparent',
  'hover:border-rb-neutral-line [&.ant-dropdown-open]:border-rb-neutral-line',
  'text-[12px] leading-[14px] text-rb-neutral-title-1',
].join(' ');

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
      align={PERPS_DROPDOWN_ALIGN}
      overlay={
        <Menu
          className={PERPS_DROPDOWN_MENU_CLASS}
          onClick={(info) => onSelect(info.key as string)}
        >
          {options.map((option) => (
            <Menu.Item key={option.key}>
              {option.title ? (
                <PerpsTooltip title={option.title} placement="left">
                  <span className="desktop-perps-dropdown-item-fill">
                    {option.label}
                  </span>
                </PerpsTooltip>
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
