import { ReactComponent as RcIconSettings } from '@/ui/assets/swap/settings.svg';
import { ReactComponent as RcIconHistory } from '@/ui/assets/swap/history.svg';

import { PageHeader } from '@/ui/component';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AggregatorsSettings } from './AggregatorsSettings';
import {
  usePollBridgePendingNumber,
  useSetSettingVisible,
  useSettingVisible,
} from '../hooks';
import { BridgeTxHistory } from './BridgeHistory';
import { useTranslation } from 'react-i18next';
import { useRabbyDispatch } from '@/ui/store';
import { PendingTx } from './PendingTx';

export const Header = () => {
  const visible = useSettingVisible();
  const setVisible = useSetSettingVisible();

  const [historyVisible, setHistoryVisible] = useState(false);
  const { t } = useTranslation();

  const dispath = useRabbyDispatch();

  // const loadingNumber = 0;

  const loadingNumber = usePollBridgePendingNumber();

  const openHistory = useCallback(() => {
    setHistoryVisible(true);
  }, []);

  useEffect(() => {
    dispath.bridge.fetchAggregatorsList();
    dispath.bridge.fetchSupportedChains();
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
              <RcIconHistory className="cursor-pointer" onClick={openHistory} />
            )}
            <RcIconSettings
              className="cursor-pointer"
              onClick={useCallback(() => {
                setVisible(true);
              }, [])}
            />
          </div>
        }
      >
        {t('page.bridge.title')}
      </PageHeader>
      <AggregatorsSettings
        visible={visible}
        onClose={useCallback(() => {
          setVisible(false);
        }, [])}
      />
      <BridgeTxHistory
        visible={historyVisible}
        onClose={useCallback(() => {
          setHistoryVisible(false);
        }, [])}
      />
    </>
  );
};
