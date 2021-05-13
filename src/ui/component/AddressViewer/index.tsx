import React from 'react';
import cx from 'clsx';
import { Icon } from 'ui/component';
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
        {ellipsis ? `${address.slice(0, 5)}...${address.slice(-4)}` : address}
      </div>
      {showArrow && <Icon type="triangle" className="ml-1 cursor-pointer" />}
    </div>
  );
};
