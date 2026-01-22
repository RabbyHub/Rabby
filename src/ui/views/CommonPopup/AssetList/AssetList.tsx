import { useCommonPopupView, useWallet } from '@/ui/utils';
import React, { useState, useRef, useEffect } from 'react';
import { ChainList } from './ChainList';
import { AssetListContainer } from './AssetListContainer';
import NetSwitchTabs, {
  useSwitchNetTab,
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
import { RcIconExternal1CC, RcIconExternalCC } from '@/ui/assets/dashboard';
import { useScroll } from 'ahooks';

export const AssetList = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose?(): void;
}) => {
  const { t } = useTranslation();
  const { setHeight, data } = useCommonPopupView();
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
  const [isTestnetEmptyAssets, setIsTestnetEmptyAssets] = useState(false);
  const { isShowTestnet, selectedTab, onTabChange } = useSwitchNetTab();

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
  const scroll = useScroll(containerRef);

  return (
    <div ref={containerRef} className="pt-[12px] h-full overflow-auto">
      <div className="px-[20px] pb-[12px]">
        {isShowTestnet ? (
          <NetSwitchTabs
            value={selectedTab}
            onTabChange={onTabChange}
            // className="h-[28px] box-content mt-[20px] mb-[20px]"
          />
        ) : (
          <div className="h-[8px]" />
        )}
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
      <footer className={clsx('h-[69px] mt-[8px]')}>
        <div
          className={clsx(
            'fixed bottom-0 left-0 right-0',
            'px-[20px] py-[14px]',
            'border-t-[0.5px] border-solid border-rabby-neutral-line',
            'bg-r-neutral-bg-2',
            scroll?.top ? 'hidden' : ''
          )}
        >
          <button
            type="button"
            className={clsx(
              'w-full h-[40px] text-r-blue-default text-[13px] leading-[16px] font-medium',
              'rounded-[8px]',
              'border-[1px] border-solid border-rabby-blue-default',
              'bg-r-neutral-bg-2 hover:bg-r-blue-light1'
            )}
            onClick={() => {
              wallet.openInDesktop('/desktop/profile');
              window.close();
            }}
          >
            <div className="flex items-center justify-center gap-[4px]">
              {t('page.dashboard.assets.openInTab')}
              <RcIconExternalCC
                viewBox="0 0 18 18"
                className="w-[16px] h-[16px]"
              />
            </div>
          </button>
        </div>
      </footer>
    </div>
  );
};
