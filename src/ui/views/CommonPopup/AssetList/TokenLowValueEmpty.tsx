import React from 'react';
import { ReactComponent as AssetEmptySVG } from '@/ui/assets/dashboard/asset-empty.svg';

export const TokenLowValueEmpty: React.FC = () => {
  return (
    <div className="mt-[117px]">
      <AssetEmptySVG className="m-auto" />
      <div className="mt-[24px] text-gray-subTitle text-13 text-center">
        Custom token added by you will be shown here
      </div>
    </div>
  );
};
