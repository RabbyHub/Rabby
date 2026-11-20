import clsx from 'clsx';
import React, { MouseEventHandler } from 'react';
import { Loading3QuartersOutlined } from '@ant-design/icons';
import styles from './DbkButton.module.css';

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
    <button
      type="button"
      className={clsx(
        styles.button,
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
    </button>
  );
};
