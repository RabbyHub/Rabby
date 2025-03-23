import clsx from 'clsx';
import React, { MouseEventHandler } from 'react';
import styled from 'styled-components';
import { Loading3QuartersOutlined } from '@ant-design/icons';

const Button = styled.button`
  position: relative;
  &:hover {
    box-shadow: 0px 4px 8px 0px rgba(255, 124, 96, 0.4);
  }
  &:disabled {
    opacity: 0.4;
    box-shadow: none;
    cursor: not-allowed;
  }
  &:not(:disabled):active:before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    top: 0;
    border-radius: 900px;
    background-color: rgba(0, 0, 0, 0.1);
  }
`;

interface Props {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  loading?: boolean;
  size?: 'small' | 'medium';
}
export const DbkButton = ({
  children,
  className,
  style,
  onClick,
  disabled,
  loading,
  size = 'medium',
}: Props) => {
  return (
    <Button
      type="button"
      className={clsx(
        'rounded-full bg-r-orange-DBK',
        'text-r-neutral-title2 font-semibold',
        'inline-flex items-center gap-[8px] justify-center',
        size === 'small'
          ? 'text-[13px] leading-[16px] py-[6px] px-[16px]'
          : 'py-[9px] px-[18px] text-[15px] leading-[18px]',
        className
      )}
      style={style}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <Loading3QuartersOutlined className="animate-spin block" />
      ) : null}
      <span>{children}</span>
    </Button>
  );
};
