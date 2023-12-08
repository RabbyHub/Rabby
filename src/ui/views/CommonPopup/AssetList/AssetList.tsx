import { useCommonPopupView } from '@/ui/utils';
import React, { useState } from 'react';
import { ChainList } from './ChainList';
import { AssetListContainer } from './AssetListContainer';
import NetSwitchTabs, {
  useSwitchNetTab,
} from 'ui/component/PillsSwitch/NetSwitchTabs';
import { ReactComponent as AssetEmptySVG } from '@/ui/assets/dashboard/asset-empty.svg';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

export const AssetList = ({ visible }: { visible: boolean }) => {
  const { t } = useTranslation();
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

  React.useEffect(() => {
    if (visible) {
      onTabChange('mainnet');
    }
  }, [visible]);

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
        <div className={clsx('mt-[160px]', isEmptyAssets ? 'block' : 'hidden')}>
          <AssetEmptySVG className="m-auto" />
          <div className="mt-[16px] text-r-neutral-foot text-12 text-center">
            {t('page.dashboard.assets.noAssets')}
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
      </div>
      <div className={clsx(selectedTab === 'testnet' ? 'block' : 'hidden')}>
        <div
          className={clsx(
            'mt-[160px]',
            isTestnetEmptyAssets ? 'block' : 'hidden'
          )}
        >
          <AssetEmptySVG className="m-auto" />
          <div className="mt-[16px] text-r-neutral-foot text-12 text-center">
            {t('page.dashboard.assets.noAssets')}
          </div>
        </div>
        <div className={clsx(isTestnetEmptyAssets ? 'hidden' : 'block')}>
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
