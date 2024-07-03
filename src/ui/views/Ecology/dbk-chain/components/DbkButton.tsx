import clsx from 'clsx';
import React, { MouseEventHandler } from 'react';
import styled from 'styled-components';

const Button = styled.button`
  &:hover {
    box-shadow: 0px 4px 8px 0px rgba(255, 124, 96, 0.4);
  }
  &:disabled {
    opacity: 0.4;
    box-shadow: none;
    cursor: not-allowed;
  }
`;

interface Props {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}
export const DbkButton = ({
  children,
  className,
  style,
  onClick,
  disabled,
}: Props) => {
  return (
    <Button
      type="button"
      className={clsx(
        'rounded-full bg-r-orange-DBK py-[9px] px-[18px]',
        'text-r-neutral-title2 text-[15px] leading-[18px] font-semibold',
        className
      )}
      style={style}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
};
