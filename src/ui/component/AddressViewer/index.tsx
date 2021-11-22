import React from 'react';
import cx from 'clsx';
import { SvgIconArrowDown } from 'ui/assets';
import './style.less';

interface AddressViewProps {
  address: string;
  onClick?(): void;
  ellipsis?: boolean;
  showArrow?: boolean;
  className?: string;
  brandName?: string;
}

export default ({
  address,
  onClick,
  ellipsis = true,
  showArrow = true,
  className = 'normal',
  brandName = '',
}: AddressViewProps) => {
  return (
    <div
      className="flex flex-col items-center"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'inherit' }}
    >
      {brandName && (
        <div className="text-13 self-start text-white">{brandName}</div>
      )}
      <div
        className={cx('address-viewer-text text-12 opacity-60', className)}
        title={address}
      >
        {ellipsis ? `${address.slice(0, 6)}...${address.slice(-4)}` : address}
      </div>
      {showArrow && (
        <SvgIconArrowDown className="ml-1 cursor-pointer fill-current text-white opacity-80" />
      )}
    </div>
  );
};
