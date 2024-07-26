import { ReactComponent as RcIconSwapSettings } from '@/ui/assets/swap/settings.svg';
import { ReactComponent as RcIconSwapHistory } from '@/ui/assets/swap/history.svg';

import { PageHeader } from '@/ui/component';
import React, { useCallback, useState } from 'react';
import { TradingSettings } from './TradingSettings';
import {
  usePollSwapPendingNumber,
  useSetSettingVisible,
  useSettingVisible,
} from '../hooks';
import { SwapTxHistory } from './History';
import { useTranslation } from 'react-i18next';
import { useRabbyDispatch } from '@/ui/store';
import { PendingTx } from '../../Bridge/Component/PendingTx';

export const Header = () => {
  const visible = useSettingVisible();
  const setVisible = useSetSettingVisible();

  const [historyVisible, setHistoryVisible] = useState(false);
  const { t } = useTranslation();

  const loadingNumber = usePollSwapPendingNumber(5000);

  const openHistory = useCallback(() => {
    setHistoryVisible(true);
  }, []);

  const dispath = useRabbyDispatch();
  React.useEffect(() => {
    dispath.swap.getSwapSupportedDEXList();
  }, []);

  return (
    <>
      <PageHeader
        className="mx-[20px] pt-[20px] mb-[16px]"
        forceShowBack
        rightSlot={
          <div className="flex items-center gap-20 absolute bottom-0 right-0">
            {loadingNumber ? (
              <PendingTx number={loadingNumber} onClick={openHistory} />
            ) : (
              <RcIconSwapHistory
                className="cursor-pointer"
                onClick={openHistory}
              />
            )}

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
