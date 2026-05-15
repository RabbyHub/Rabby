import React from 'react';
import cx from 'clsx';
import { SvgIconArrowDown } from 'ui/assets';
import { ellipsis as ellipsisAddress } from 'ui/utils/address';
import './style.less';

interface AddressViewProps {
  address: string;
  onClick?(): void;
  ellipsis?: boolean;
  showArrow?: boolean;
  className?: string;
  showImportIcon?: boolean;
  index?: number;
  showIndex?: boolean;
}

export default ({
  address,
  onClick,
  ellipsis = true,
  showArrow = true,
  className = 'normal',
  index = -1,
  showIndex = false,
}: AddressViewProps) => {
  return (
    <div
      className="flex items-center"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'inherit' }}
    >
      <div
        className={cx('address-viewer-text', className)}
        title={address?.toLowerCase()}
      >
        {showIndex && index >= 0 && <div className="number-index">{index}</div>}
        {ellipsis
          ? ellipsisAddress(address.toLowerCase())
          : address?.toLowerCase()}
      </div>
      {showArrow && (
        <SvgIconArrowDown className="ml-1 cursor-pointer fill-current text-white opacity-80" />
      )}
    </div>
  );
};
