import { ReactComponent as RcIconHistory } from '@/ui/assets/swap/history.svg';

import { PageHeader } from '@/ui/component';
import React, { useCallback, useEffect, useState } from 'react';
import {
  usePollBridgePendingNumber,
  useSetSettingVisible,
  useSettingVisible,
} from '../hooks';
import { BridgeTxHistory } from './BridgeHistory';
import { useTranslation } from 'react-i18next';
import { useRabbyDispatch } from '@/ui/store';
import { PendingTx } from './PendingTx';
import { RabbyFeePopup } from '../../Swap/Component/RabbyFeePopup';

export const Header = () => {
  const feePopupVisible = useSettingVisible();
  const setFeePopupVisible = useSetSettingVisible();

  const [historyVisible, setHistoryVisible] = useState(false);
  const { t } = useTranslation();

  const dispath = useRabbyDispatch();

  const loadingNumber = usePollBridgePendingNumber();

  const openHistory = useCallback(() => {
    setHistoryVisible(true);
  }, []);

  const closeFeePopup = useCallback(() => {
    setFeePopupVisible(false);
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
          </div>
        }
      >
        {t('page.bridge.title')}
      </PageHeader>
      <BridgeTxHistory
        visible={historyVisible}
        onClose={useCallback(() => {
          setHistoryVisible(false);
        }, [])}
      />
      <RabbyFeePopup
        type="bridge"
        visible={feePopupVisible}
        onClose={closeFeePopup}
      />
    </>
  );
};
