import { useCommonPopupView } from '@/ui/utils';
import React, { useState } from 'react';
import { ChainList } from './ChainList';
import { AssetListContainer } from './AssetListContainer';
import NetSwitchTabs, {
  useSwitchNetTab,
} from 'ui/component/PillsSwitch/NetSwitchTabs';
import { ReactComponent as AssetEmptySVG } from '@/ui/assets/dashboard/asset-empty.svg';
import clsx from 'clsx';
import { SvgIconOffline } from '@/ui/assets';

export const AssetList = ({ visible }: { visible: boolean }) => {
  const { setHeight, data } = useCommonPopupView();
  const [selectChainId, setSelectChainId] = useState<string | null>(null);
  const [selectTestnetChainId, setSelectTestnetChainId] = useState<
    string | null
  >(null);
  const handleSelectChainChange = (id: string | null) => {
    setSelectChainId(id);
  };
  const handleTestnetSelectChainChange = (id: string | null) => {
    setSelectTestnetChainId(id);
  };
  const [isEmptyAssets, setIsEmptyAssets] = useState<boolean>(false);
  const [isTestnetEmptyAssets, setIsTestnetEmptyAssets] = useState(false);
  const { isShowTestnet, selectedTab, onTabChange } = useSwitchNetTab();

  React.useEffect(() => {
    setHeight(488);
  }, []);

  return (
    <>
      {isShowTestnet && (
        <NetSwitchTabs
          value={selectedTab}
          onTabChange={onTabChange}
          // className="h-[28px] box-content mt-[20px] mb-[20px]"
        />
      )}
      <div className={clsx(selectedTab === 'mainnet' ? 'block' : 'hidden')}>
        {data?.isOffline && (
          <div className="text-gray-subTitle mt-40 flex items-center justify-center">
            <SvgIconOffline className="mr-4 text-gray-subTitle" />
            <span className="leading-tight">
              {'The network is disconnected and no data is obtained'}
            </span>
          </div>
        )}
        <div
          className={clsx(
            'mt-[160px]',
            isEmptyAssets && !data?.isOffline ? 'block' : 'hidden'
          )}
        >
          <AssetEmptySVG className="m-auto" />
          <div className="mt-[16px] text-gray-subTitle text-12 text-center">
            No assets
          </div>
        </div>
        <div
          className={clsx(
            isEmptyAssets || data?.isOffline ? 'hidden' : 'block'
          )}
        >
          <ChainList onChange={handleSelectChainChange} />
          <AssetListContainer
            className="mt-12"
            selectChainId={selectChainId}
            visible={visible}
            onEmptyAssets={setIsEmptyAssets}
          />
        </div>
      </div>
      <div className={clsx(selectedTab === 'testnet' ? 'block' : 'hidden')}>
        {data?.isTestnetOffline && (
          <div className="text-gray-subTitle mt-40 flex items-center justify-center">
            <SvgIconOffline className="mr-4 text-gray-subTitle" />
            <span className="leading-tight">
              {'The network is disconnected and no data is obtained'}
            </span>
          </div>
        )}
        <div
          className={clsx(
            'mt-[160px]',
            isTestnetEmptyAssets && !data?.isTestnetOffline ? 'block' : 'hidden'
          )}
        >
          <AssetEmptySVG className="m-auto" />
          <div className="mt-[16px] text-gray-subTitle text-12 text-center">
            No assets
          </div>
        </div>
        <div
          className={clsx(
            isTestnetEmptyAssets || data?.isTestnetOffline ? 'hidden' : 'block'
          )}
        >
          <ChainList onChange={handleTestnetSelectChainChange} isTestnet />
          <AssetListContainer
            className="mt-12"
            selectChainId={selectTestnetChainId}
            visible={visible}
            onEmptyAssets={setIsTestnetEmptyAssets}
            isTestnet
          />
        </div>
      </div>
    </>
  );
};
