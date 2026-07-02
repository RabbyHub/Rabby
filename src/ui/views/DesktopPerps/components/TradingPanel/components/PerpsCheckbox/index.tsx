import { Checkbox } from '@/ui/component';
import { Tooltip } from 'antd';
import React from 'react';

interface PerpsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title?: string | React.ReactNode;
  tooltipText?: string;
  disabled?: boolean;
  /**
   * 'checkbox' = square with checkmark (default), 'radio' = circle with dot,
   * 'radio-check' = circle with checkmark (single-select, e.g. margin mode)
   */
  variant?: 'checkbox' | 'radio' | 'radio-check';
  /** Rendered width/height of the indicator in px (default 14). */
  size?: number;
}

const CheckboxIcon = ({
  checked,
  size = 14,
}: {
  checked: boolean;
  size?: number;
}) =>
  checked ? (
    <svg
      width={size}
      height={size}
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
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" stroke="#6A7587" />
    </svg>
  );

const RadioIcon = ({
  checked,
  size = 14,
}: {
  checked: boolean;
  size?: number;
}) =>
  checked ? (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="7.5" stroke="var(--rb-neutral-foot, #6A7587)" />
      <circle cx="8" cy="8" r="4" fill="var(--rb-neutral-foot, #6A7587)" />
    </svg>
  ) : (
    <svg
      width={size}
      height={size}
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

const RadioCheckIcon = ({
  checked,
  size = 14,
}: {
  checked: boolean;
  size?: number;
}) =>
  checked ? (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.00005 15.1998C9.98826 15.1998 11.7883 14.3939 13.0912 13.091C14.3942 11.788 15.2 9.98801 15.2 7.9998C15.2 6.0116 14.3942 4.2116 13.0912 2.90863C11.7883 1.60569 9.98826 0.799805 8.00005 0.799805C6.01184 0.799805 4.21184 1.60569 2.90888 2.90863C1.60594 4.2116 0.800049 6.0116 0.800049 7.9998C0.800049 9.98801 1.60594 11.788 2.90888 13.091C4.21184 14.3939 6.01184 15.1998 8.00005 15.1998Z"
        fill="#7084FF"
      />
      <path
        d="M4.66724 7.99913L7.11168 10.4436L12.0006 5.55469"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.0001 14.3996C11.5347 14.3996 14.4001 11.5342 14.4001 7.99961C14.4001 4.46499 11.5347 1.59961 8.0001 1.59961C4.46548 1.59961 1.6001 4.46499 1.6001 7.99961C1.6001 11.5342 4.46548 14.3996 8.0001 14.3996Z"
        stroke="#D3D8E0"
        strokeMiterlimit="10"
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
  size = 14,
}: PerpsCheckboxProps) => {
  const icon =
    variant === 'radio' ? (
      <RadioIcon checked={checked} size={size} />
    ) : variant === 'radio-check' ? (
      <RadioCheckIcon checked={checked} size={size} />
    ) : (
      <CheckboxIcon checked={checked} size={size} />
    );

  return (
    <Checkbox
      checked={checked}
      type="square"
      onChange={onChange}
      disabled={disabled}
      unCheckBackground="transparent"
      background="transparent"
      width={`${size}px`}
      height={`${size}px`}
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
            <span className="text-r-neutral-title-1 text-12">{title}</span>
          </Tooltip>
        ) : (
          <span className="text-r-neutral-title-1 text-12">{title}</span>
        ))}
    </Checkbox>
  );
};
