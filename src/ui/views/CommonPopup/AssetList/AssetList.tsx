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
import { CustomTestnetAssetList } from './CustomTestnetAssetList';
import { AddCustomTokenPopup } from './CustomAssetList/AddCustomTokenPopup';
import { Button } from 'antd';
import { SpecialTokenListPopup } from './components/TokenButton';
import { useRabbySelector } from '@/ui/store';
import useSortToken from '@/ui/hooks/useSortTokens';

export const AssetList = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose?(): void;
}) => {
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

  const [isShowAddModal, setIsShowAddModal] = useState<boolean>(false);

  const { customize } = useRabbySelector((store) => store.account.tokens);
  const tokens = useSortToken(customize);
  const [showCustomizedTokens, setShowCustomizedTokens] = React.useState(false);

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
        <div className={clsx('mt-[120px]', isEmptyAssets ? 'block' : 'hidden')}>
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
              label={t('page.dashboard.tokenDetail.customizedButton')}
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
        <CustomTestnetAssetList visible={visible} onClose={onClose} />
      </div>
    </>
  );
};
