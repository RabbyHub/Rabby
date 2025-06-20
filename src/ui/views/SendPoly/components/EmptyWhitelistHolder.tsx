import React from 'react';
import { ReactComponent as RcEmptyWhitelistLogo } from '@/ui/assets/address/EmptyWhiteListLogo.svg';

interface IProps {
  onAddWhitelist?: () => void;
}

export const EmptyWhitelistHolder = ({ onAddWhitelist }: IProps) => {
  const handleAddWhitelist = () => {
    onAddWhitelist?.();
  };

  return (
    <div className="flex flex-col items-center px-[20px] pt-[39px] pb-[24px] bg-r-neutral-card1 rounded-[8px] mt-[9px]">
      <div>
        <RcEmptyWhitelistLogo width={60} height={60} />
      </div>
      <div>
        <div className="text-r-neutral-title1 text-[20px] font-medium mt-[16px] text-center">
          Add Whitelist Address
        </div>
        <div className="text-[15px] text-r-neutral-foot mt-[8px] text-center">
          Add trusted addresses to whitelist for fast transfers---no
          confirmation needed next time
        </div>
      </div>
      <div
        className={`mt-[47px] font-medium text-[16px] text-r-blue-default text-center w-full
          border border-r-blue-default rounded-[8px]
          h-[48px] leading-[48px] cursor-pointer
          hover:bg-r-blue-light1
        `}
        onClick={handleAddWhitelist}
      >
        Add Now
      </div>
    </div>
  );
};
