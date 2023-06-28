import { useCommonPopupView } from '@/ui/utils';
import React, { useState } from 'react';
import { ChainList } from './ChainList';
import { AssetListContainer } from './AssetListContainer';
import { ReactComponent as AssetEmptySVG } from '@/ui/assets/dashboard/asset-empty.svg';
import clsx from 'clsx';
import { useNetworkState } from 'react-use';
import { SvgIconOffline } from '@/ui/assets';

export const AssetList = ({ visible }: { visible: boolean }) => {
  const { setHeight } = useCommonPopupView();
  const [selectChainId, setSelectChainId] = useState<string | null>(null);
  const handleSelectChainChange = (id: string | null) => {
    setSelectChainId(id);
  };
  const [isEmptyAssets, setIsEmptyAssets] = useState<boolean>(false);
  const { online } = useNetworkState();

  React.useEffect(() => {
    setHeight(488);
  }, []);

  if (!online) {
    return (
      <div className="text-gray-subTitle mt-40 flex items-center justify-center">
        <SvgIconOffline className="mr-4 text-gray-subTitle" />
        <span className="leading-tight">
          {'The network is disconnected and no data is obtained'}
        </span>
      </div>
    );
  }

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
