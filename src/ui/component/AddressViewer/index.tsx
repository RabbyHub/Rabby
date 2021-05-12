import React from 'react';
import { Icon } from 'ui/component';

interface AddressViewProps {
  address: string;
  onClick?(): void;
  ellipsis?: boolean;
  showArrow?: boolean;
}

export default ({
  address,
  onClick,
  ellipsis = true,
  showArrow = true,
}: AddressViewProps) => {
  return (
    <div
      className="flex items-center"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'inherit' }}
    >
      <div className="text-white font-bold mr-8 leading-none" title={address}>
        {ellipsis ? `${address.slice(0, 5)}...${address.slice(-4)}` : address}
      </div>
      {showArrow && <Icon type="triangle" className="ml-1 cursor-pointer" />}
    </div>
  );
};
