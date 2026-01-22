import clsx from 'clsx';
import React, { MouseEventHandler } from 'react';
import styled from 'styled-components';
import { Loading3QuartersOutlined } from '@ant-design/icons';

const Button = styled.button`
  position: relative;
  border-radius: 1000px;
  background: var(--r-orange-DBK, #ff7c60);
  color: var(--r-neutral-title2, #fff);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  padding: 9px 18px;

  font-size: 15px;
  line-height: 18px;

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
    border-radius: inherit;
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
        size === 'small' ? 'text-[13px] leading-[16px] py-[6px] px-[16px]' : '',
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
