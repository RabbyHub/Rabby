import React from 'react';

import { ReactComponent as RcIconStarCC } from './icons/star-cc.svg';
import clsx from 'clsx';

const STAR_SIZE = 32;

type StarProps = {
  size?: number;
  isFilled?: boolean;
  disabled?: boolean;
  isActive?: boolean;
  onClick?: (evt: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: (evt: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (evt: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
  className?: string;
};

export default function ClickableStar({
  isFilled = false,
  disabled = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  style,
  className,
  size: propSize = STAR_SIZE,
}: StarProps) {
  return (
    <div
      className={clsx(
        'flex items-center justify-center',
        'bg-transparent cursor-pointer',
        className
      )}
      style={{ width: propSize, height: propSize, ...style }}
      onMouseEnter={(evt) => {
        if (disabled) return;
        onMouseEnter?.(evt);
      }}
      onMouseLeave={(evt) => {
        if (disabled) return;
        onMouseLeave?.(evt);
      }}
      onClick={(evt) => {
        if (disabled) return;
        onClick?.(evt);
      }}
    >
      <RcIconStarCC
        style={{ width: propSize, height: propSize }}
        className={clsx(isFilled ? 'text-r-blue-default' : 'text-transparent')}
      />
    </div>
  );
}
