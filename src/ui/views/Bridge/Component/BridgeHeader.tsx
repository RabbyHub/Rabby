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

export const Header = ({
  onOpenInTab,
  pendingNumber,
  noShowHeader,
  historyVisible,
  setHistoryVisible,
}: {
  onOpenInTab?(): void;
  pendingNumber: number;
  noShowHeader: boolean;
  historyVisible: boolean;
  setHistoryVisible: (visible: boolean) => void;
}) => {
  const feePopupVisible = useSettingVisible();
  const setFeePopupVisible = useSetSettingVisible();
  const { t } = useTranslation();

  const dispath = useRabbyDispatch();

  const openHistory = useCallback(() => {
    setHistoryVisible(true);
  }, []);

  const gotoDashboard = () => {
    history.push('/dashboard');
  };

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
      {!noShowHeader && (
        <PageHeader
          className="mx-[20px] mb-[5px]"
          forceShowBack={!isTab}
          onBack={gotoDashboard}
          canBack={!isTab}
          isShowAccount
          rightSlot={
            <div className="flex items-center gap-20 absolute top-[50%] translate-y-[-50%] right-0">
              {isTab ? null : (
                <div
                  className="text-r-neutral-title1 cursor-pointer"
                  onClick={() => {
                    onOpenInTab?.();
                  }}
                >
                  <RcIconFullscreen />
                </div>
              )}
              <RcIconHistory className="cursor-pointer" onClick={openHistory} />
            </div>
          }
        >
          {t('page.bridge.title')}
        </PageHeader>
      )}
      <BridgeTxHistory
        visible={historyVisible}
        onClose={useCallback(() => {
          setHistoryVisible(false);
        }, [])}
        getContainer={isTab ? '.js-rabby-popup-container' : undefined}
      />
      <RabbyFeePopup
        type="bridge"
        visible={feePopupVisible}
        onClose={closeFeePopup}
        getContainer={isTab ? '.js-rabby-popup-container' : undefined}
      />
    </>
  );
};
