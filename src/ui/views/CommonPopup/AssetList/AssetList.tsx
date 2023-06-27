import { useCommonPopupView } from '@/ui/utils';
import React, { useState } from 'react';
import { ChainList } from './ChainList';
import { AssetListContainer } from './AssetListContainer';
import { ReactComponent as AssetEmptySVG } from '@/ui/assets/dashboard/asset-empty.svg';

export const AssetList = ({ visible }: { visible: boolean }) => {
  const { setHeight, data } = useCommonPopupView();
  const [selectChainId, setSelectChainId] = useState<string | null>(null);
  const handleSelectChainChange = (id: string | null) => {
    setSelectChainId(id);
  };
  const isEmptyAssets = data?.isEmptyAssets;

  React.useEffect(() => {
    setHeight(488);
  }, []);

  if (isEmptyAssets) {
    return (
      <div className="mt-[160px]">
        <AssetEmptySVG className="m-auto" />
        <div className="mt-[16px] text-gray-subTitle text-12 text-center">
          No assets
        </div>
      </div>
    );
  }
  return (
    <div>
      <ChainList onChange={handleSelectChainChange} />
      <AssetListContainer
        className="mt-12"
        selectChainId={selectChainId}
        visible={visible}
      />
    </div>
  );
};
