import React from 'react';
import { ReactComponent as RcIconEmpty } from 'ui/assets/dapp-search/cc-dapp-search-empty.svg';

export const DappSearchEmpty = () => {
  return (
    <div className="rounded-[8px] pt-[65px] pb-[83px] text-center bg-r-neutral-card1">
      <RcIconEmpty className="mx-auto" />
      <div className="text-[15px] leading-[18px] text-r-neutral-foot mt-[25px]">
        No Dapp Found
      </div>
    </div>
  );
};
