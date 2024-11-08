import { Loading3QuartersOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import React, { MouseEventHandler } from 'react';

interface Props {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  loading?: boolean;
  rounded?: boolean;
}

export const SonicButton = ({
  children,
  className,
  style,
  onClick,
  disabled,
  loading,
  rounded,
}: Props) => {
  return (
    <button
      type="button"
      className={clsx(
        'relative bg-r-sonic-btn text-r-sonic-btn-foreground font-semibold',
        'inline-flex items-center gap-[8px] justify-center',
        'disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed',
        'text-[12px] leading-[16px] font-bold',
        'px-[16px] py-[5px]',
        'transition-all duration-200 ease-in-out',
        'hover:brightness-110 hover:scale-[1.02]',
        'active:brightness-95 active:scale-100',
        rounded ? 'rounded-full' : 'rounded-md',
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
