import { useCommonPopupView } from '@/ui/utils';
import React, { useState } from 'react';
import { ChainList } from './ChainList';
import { AssetListContainer } from './AssetListContainer';
import { ReactComponent as AssetEmptySVG } from '@/ui/assets/dashboard/asset-empty.svg';
import clsx from 'clsx';

export const AssetList = ({ visible }: { visible: boolean }) => {
  const { setHeight, data } = useCommonPopupView();
  const [selectChainId, setSelectChainId] = useState<string | null>(null);
  const handleSelectChainChange = (id: string | null) => {
    setSelectChainId(id);
  };
  const [isEmptyAssets, setIsEmptyAssets] = useState<boolean>(false);

  React.useEffect(() => {
    setHeight(488);
  }, []);

  return (
    <>
      <div className={clsx('mt-[160px]', isEmptyAssets ? 'block' : 'hidden')}>
        <AssetEmptySVG className="m-auto" />
        <div className="mt-[16px] text-gray-subTitle text-12 text-center">
          No assets
        </div>
      </div>

      <div className={clsx(isEmptyAssets ? 'hidden' : 'block')}>
        <ChainList onChange={handleSelectChainChange} />
        <AssetListContainer
          className="mt-12"
          selectChainId={selectChainId}
          visible={visible}
          onEmptyAssets={setIsEmptyAssets}
        />
      </div>
    </>
  );
};
