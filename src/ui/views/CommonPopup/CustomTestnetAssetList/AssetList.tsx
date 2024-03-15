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

export const CustomTestnetAssetList = ({ visible }: { visible: boolean }) => {
  const { t } = useTranslation();

  const [isTestnetEmptyAssets, setIsTestnetEmptyAssets] = useState(false);

  return (
    <>
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
        <AssetListContainer
          className="mt-12"
          visible={visible}
          onEmptyAssets={setIsTestnetEmptyAssets}
        />
      </div>
    </>
  );
};
