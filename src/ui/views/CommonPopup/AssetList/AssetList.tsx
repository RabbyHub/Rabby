import { useCommonPopupView, useWallet } from '@/ui/utils';
import React, { useState, useRef } from 'react';
import { ChainList } from './ChainList';
import { AssetListContainer } from './AssetListContainer';
import NetSwitchTabs, {
  usePureNetSwitch,
} from 'ui/component/PillsSwitch/NetSwitchTabs';
import { ReactComponent as AssetEmptySVG } from '@/ui/assets/dashboard/asset-empty.svg';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { CustomTestnetAssetList } from './CustomTestnetAssetList';
import { AddCustomTokenPopup } from './CustomAssetList/AddCustomTokenPopup';
import { Button } from 'antd';
import { SpecialTokenListPopup } from './components/TokenButton';
import { TestnetChainList } from './TestnetChainList';
import { useFilteredTokens } from './useFilteredTokens';
import { ReactComponent as RcIconFullscreen } from '@/ui/assets/fullscreen-cc.svg';

export const AssetList = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose?(): void;
}) => {
  const { t } = useTranslation();
  const { setHeight } = useCommonPopupView();
  const containerRef = useRef<HTMLDivElement>(null);
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
  const { selectedTab, onTabChange } = usePureNetSwitch();

  React.useEffect(() => {
    setHeight(500);
  }, []);

  React.useEffect(() => {
    if (visible) {
      onTabChange('mainnet');
    } else {
      // Reset scroll position when component becomes invisible
      setTimeout(() => {
        if (containerRef.current && containerRef.current.parentElement) {
          containerRef.current.parentElement.scrollTop = 0;
        }
      }, 200);
    }
  }, [visible]);

  const [isShowAddModal, setIsShowAddModal] = useState<boolean>(false);

  const { sortedCustomize: tokens } = useFilteredTokens(selectChainId, false);
  const [showCustomizedTokens, setShowCustomizedTokens] = React.useState(false);
  const wallet = useWallet();
  const handleOpenInTab = () => {
    wallet.openInDesktop('/desktop/profile');
    window.close();
  };

  return (
    <div ref={containerRef} className="pt-[12px] h-full overflow-auto">
      <div className="px-[20px] pb-[12px]">
        <div className="relative min-h-[32px]">
          <NetSwitchTabs
            value={selectedTab}
            onTabChange={onTabChange}
            // className="h-[28px] box-content mt-[20px] mb-[20px]"
          />

          <div className="absolute top-0 right-0 h-[32px] flex items-center">
            <div
              className="text-rb-neutral-body cursor-pointer relative hit-slop-8"
              onClick={handleOpenInTab}
            >
              <RcIconFullscreen />
            </div>
          </div>
        </div>
        <div className={clsx(selectedTab === 'mainnet' ? 'block' : 'hidden')}>
          <div
            className={clsx('mt-[120px]', isEmptyAssets ? 'block' : 'hidden')}
          >
            <AssetEmptySVG className="m-auto" />
            <div className="mt-0 text-r-neutral-foot text-[14px] text-center">
              {t('page.dashboard.assets.noAssets')}
            </div>

            {isEmptyAssets ? (
              <div className="w-[100%] flex justify-center items-center">
                <Button
                  type="primary"
                  className="w-[200px] h-[44px] mt-[50px]"
                  onClick={() => {
                    setIsShowAddModal(true);
                  }}
                >
                  {t('page.dashboard.assets.customButtonText')}
                </Button>
                <AddCustomTokenPopup
                  visible={isShowAddModal}
                  onClose={() => {
                    setIsShowAddModal(false);
                  }}
                  onConfirm={(addedToken) => {
                    setIsShowAddModal(false);
                    setShowCustomizedTokens(true);
                  }}
                />
              </div>
            ) : (
              <SpecialTokenListPopup
                label={
                  tokens?.length > 1
                    ? t('page.dashboard.tokenDetail.customizedButtons')
                    : t('page.dashboard.tokenDetail.customizedButton')
                }
                buttonText={t('page.dashboard.assets.customButtonText')}
                description={t('page.dashboard.assets.customDescription')}
                onClickButton={() => {
                  setShowCustomizedTokens(true);
                }}
                tokens={tokens}
                visible={showCustomizedTokens}
                onClose={() => setShowCustomizedTokens(false)}
              />
            )}
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
          <TestnetChainList onChange={handleTestnetSelectChainChange} />
          <CustomTestnetAssetList
            selectChainId={selectTestnetChainId}
            visible={visible}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};
