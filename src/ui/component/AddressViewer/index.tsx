import React from 'react';
import cx from 'clsx';
import { IconArrowDown } from 'ui/assets';
import './style.less';

interface AddressViewProps {
  address: string;
  onClick?(): void;
  ellipsis?: boolean;
  showArrow?: boolean;
  className?: string;
}

export default ({
  address,
  onClick,
  ellipsis = true,
  showArrow = true,
  className = 'normal',
}: AddressViewProps) => {
  return (
    <div
      className="flex items-center"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'inherit' }}
    >
      <div className={cx('address-viewer-text', className)} title={address}>
        {ellipsis ? `${address.slice(0, 6)}...${address.slice(-4)}` : address}
      </div>
      {showArrow && (
        <IconArrowDown className="ml-1 cursor-pointer fill-current text-white" />
      )}
    </div>
  );
};
