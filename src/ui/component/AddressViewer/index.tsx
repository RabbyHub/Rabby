import React from 'react';
import { SvgIconArrowDown } from 'ui/assets';
import { ellipsis as ellipsisAddress } from 'ui/utils/address';
import { cn } from '@/ui/utils/cn';

// Styles of the variant classes a caller can put in className. They stay on the
// element as well; a className without one only gets the caller's classes.
const VARIANT_CLASSES: Record<string, string> = {
  normal: 'mr-4 text-15 font-medium text-white',
  subtitle: 'text-[12px] text-r-neutral-body',
  'import-color': 'mr-4 text-15 font-medium text-[#000]',
};

interface AddressViewProps {
  address: string;
  onClick?(): void;
  ellipsis?: boolean | 'short';
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
        className={cn(
          'address-viewer-text',
          className.split(/\s+/).map((c) => VARIANT_CLASSES[c]),
          className
        )}
        title={address?.toLowerCase()}
      >
        {showIndex && index >= 0 && (
          <div className="number-index font-normal text-[12px] text-r-neutral-foot mr-[22px]">
            {index}
          </div>
        )}
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
