import { ReactComponent as RcIconSwapSettings } from '@/ui/assets/swap/settings.svg';
import { ReactComponent as RcIconSwapHistory } from '@/ui/assets/swap/history.svg';

import { PageHeader } from '@/ui/component';
import React, { useCallback, useState } from 'react';
import { TradingSettings } from './TradingSettings';
import { useSetSettingVisible, useSettingVisible } from '../hooks';
import { SwapTxHistory } from './History';
import { useTranslation } from 'react-i18next';

export const Header = () => {
  const visible = useSettingVisible();
  const setVisible = useSetSettingVisible();

  const [historyVisible, setHistoryVisible] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        className="mx-[20px] pt-[20px] mb-[16px]"
        forceShowBack
        rightSlot={
          <div className="flex items-center gap-20 absolute bottom-0 right-0">
            <RcIconSwapHistory
              className="cursor-pointer"
              onClick={useCallback(() => {
                setHistoryVisible(true);
              }, [])}
            />
            <RcIconSwapSettings
              className="cursor-pointer"
              onClick={useCallback(() => {
                setVisible(true);
              }, [])}
            />
          </div>
        }
      >
        {t('page.swap.title')}
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
