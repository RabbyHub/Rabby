import { ReactComponent as AssetEmptySVG } from '@/ui/assets/dashboard/asset-empty.svg';
import clsx from 'clsx';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomTestnetAssetListContainer } from './CustomTestnetAssetListContainer';
import { Button } from 'antd';
import { useHistory } from 'react-router-dom';

export const CustomTestnetAssetList = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose?(): void;
}) => {
  const { t } = useTranslation();

  const [isTestnetEmptyAssets, setIsTestnetEmptyAssets] = useState(false);
  const history = useHistory();

  return (
    <>
      <div
        className={clsx(
          'mt-[120px]',
          isTestnetEmptyAssets ? 'block' : 'hidden'
        )}
      >
        <AssetEmptySVG className="m-auto" />
        <div>
          <div className="mt-0 text-r-neutral-foot text-[14px] text-center">
            {t('page.dashboard.assets.noTestnetAssets')}
          </div>
          <div className="text-center mt-[50px]">
            <Button
              type="primary"
              onClick={() => {
                onClose?.();
                history.push('/custom-testnet');
              }}
              className="w-[200px] h-[44px]"
            >
              {t('component.ChainSelectorModal.addTestnet')}
            </Button>
          </div>
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
