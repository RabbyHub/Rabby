import { ReactComponent as IconSwapSettings } from '@/ui/assets/swap/settings.svg';
import { ReactComponent as IconSwapHistory } from '@/ui/assets/swap/history.svg';

import { PageHeader } from '@/ui/component';
import React, { useCallback, useState } from 'react';
import { TradingSettings } from './TradingSettings';
import { useSetSettingVisible, useSettingVisible } from '../hooks';
import { SwapTxHistory } from './History';

export const Header = () => {
  const visible = useSettingVisible();
  const setVisible = useSetSettingVisible();

  const [historyVisible, setHistoryVisible] = useState(false);

  return (
    <>
      <PageHeader
        className="mx-[20px] pt-[20px] mb-[16px]"
        forceShowBack
        rightSlot={
          <div className="flex items-center gap-20">
            <IconSwapSettings
              className="cursor-pointer"
              onClick={useCallback(() => {
                setVisible(true);
              }, [])}
            />
            <IconSwapHistory
              className="cursor-pointer"
              onClick={useCallback(() => {
                setHistoryVisible(true);
              }, [])}
            />
          </div>
        }
      >
        Swap
      </PageHeader>
      <TradingSettings
        visible={visible}
        onClose={useCallback(() => {
          setVisible(false);
        }, [])}
      />
      <SwapTxHistory
        visible={historyVisible}
        onClose={useCallback(() => {
          setHistoryVisible(false);
        }, [])}
      />
    </>
  );
};
