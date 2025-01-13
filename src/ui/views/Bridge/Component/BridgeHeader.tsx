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
import { getUiType, openInternalPageInTab } from '@/ui/utils';
import { useHistory } from 'react-router-dom';
import { ReactComponent as RcIconFullscreen } from '@/ui/assets/fullscreen-cc.svg';
const isTab = getUiType().isTab;

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
  const history = useHistory();

  return (
    <>
      <PageHeader
        className="mx-[20px] pt-[20px] mb-[16px]"
        forceShowBack={!isTab}
        canBack={!isTab}
        rightSlot={
          <div className="flex items-center gap-20 absolute bottom-0 right-0">
            {isTab ? null : (
              <div
                className="text-r-neutral-title1 cursor-pointer"
                onClick={() => {
                  openInternalPageInTab(`bridge${history.location.search}`);
                }}
              >
                <RcIconFullscreen />
              </div>
            )}
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
        getContainer={isTab ? '.js-rabby-popup-container' : false}
      />
      <RabbyFeePopup
        type="bridge"
        visible={feePopupVisible}
        onClose={closeFeePopup}
        getContainer={isTab ? '.js-rabby-popup-container' : false}
      />
    </>
  );
};
