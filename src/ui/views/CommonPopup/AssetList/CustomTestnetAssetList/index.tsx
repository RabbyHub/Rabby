import { ReactComponent as AssetEmptySVG } from '@/ui/assets/dashboard/asset-empty.svg';
import clsx from 'clsx';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomTestnetAssetListContainer } from './CustomTestnetAssetListContainer';

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
        <div className="mt-0 text-r-neutral-foot text-[14px] text-center">
          {t('page.dashboard.assets.noAssets')}
        </div>
      </div>
      <div className={clsx(isTestnetEmptyAssets ? 'hidden' : 'block')}>
        <CustomTestnetAssetListContainer
          className="mt-12"
          visible={visible}
          onEmptyAssets={setIsTestnetEmptyAssets}
        />
      </div>
    </>
  );
};
