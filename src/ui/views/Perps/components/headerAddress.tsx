import { Account } from '@/background/service/preference';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import React from 'react';

export const HeaderAddress = ({ account }: { account: Account }) => {
  const addressTypeIcon = useBrandIcon({
    address: account?.address,
    brandName: account?.brandName,
    type: account?.type,
    forceLight: false,
  });

  return (
    <div className="flex items-center">
      <img className="w-[16px] h-[16px] mr-[4px]" src={addressTypeIcon} />
      <div className="text-r-neutral-body text-[13px] leading-[16px] font-medium">
        {account?.alianName || account?.address}
      </div>
    </div>
  );
};
