import { ReactComponent as IconSwapSettings } from '@/ui/assets/swap/settings.svg';
import { PageHeader } from '@/ui/component';
import React from 'react';
import { TradingSettings } from './TradingSettings';
import { useSetSettingVisible, useSettingVisible } from '../hooks';

export const Header = () => {
  const visible = useSettingVisible();
  const setVisible = useSetSettingVisible();
  return (
    <>
      <PageHeader
        className="mx-[20px]"
        forceShowBack
        rightSlot={
          <IconSwapSettings
            className="cursor-pointer"
            onClick={() => {
              setVisible(true);
            }}
          />
        }
      >
        Swap
      </PageHeader>
      <TradingSettings
        visible={visible}
        onClose={() => {
          setVisible(false);
        }}
      />
    </>
  );
};
