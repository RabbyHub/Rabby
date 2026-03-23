import { Checkbox } from '@/ui/component';
import { Tooltip } from 'antd';
import React from 'react';

interface PerpsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title?: string | React.ReactNode;
  tooltipText?: string;
  disabled?: boolean;
  /** 'checkbox' = square with checkmark (default), 'radio' = circle with dot */
  variant?: 'checkbox' | 'radio';
}

const CheckboxIcon = ({ checked }: { checked: boolean }) =>
  checked ? (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" fill="#4C65FF" />
      <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" stroke="#4C65FF" />
      <path
        d="M4.66797 7.99913L7.11241 10.4436L12.0013 5.55469"
        stroke="white"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" stroke="#6A7587" />
    </svg>
  );

const RadioIcon = ({ checked }: { checked: boolean }) =>
  checked ? (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="7.5" stroke="var(--rb-neutral-foot, #6A7587)" />
      <circle cx="8" cy="8" r="4" fill="var(--rb-neutral-foot, #6A7587)" />
    </svg>
  ) : (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="8"
        cy="8"
        r="7.5"
        stroke="var(--rb-neutral-secondary, #6A7587)"
      />
    </svg>
  );

export const PerpsCheckbox = ({
  checked,
  onChange,
  title,
  tooltipText,
  disabled,
  variant = 'checkbox',
}: PerpsCheckboxProps) => {
  const icon =
    variant === 'radio' ? (
      <RadioIcon checked={checked} />
    ) : (
      <CheckboxIcon checked={checked} />
    );

  return (
    <Checkbox
      checked={checked}
      type="square"
      onChange={onChange}
      disabled={disabled}
      unCheckBackground="transparent"
      background="transparent"
      width="16px"
      height="16px"
      checkIcon={icon}
    >
      {title &&
        (tooltipText ? (
          <Tooltip
            title={tooltipText}
            overlayClassName="rectangle"
            placement="top"
            trigger="hover"
          >
            <span className="text-r-neutral-title-1 text-[12px]">{title}</span>
          </Tooltip>
        ) : (
          <span className="text-r-neutral-title-1 text-[12px]">{title}</span>
        ))}
    </Checkbox>
  );
};
