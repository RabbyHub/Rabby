import { ReactComponent as RcIconHistory } from '@/ui/assets/swap/history-cc.svg';
import { ReactComponent as RcIconHistoryPending } from '@/ui/assets/bridge/IconHistoryPendingCC.svg';

import { PageHeader } from '@/ui/component';
import React, { useCallback, useEffect, useState } from 'react';
import { useSetSettingVisible, useSettingVisible } from '../hooks';
import { BridgeTxHistory } from './BridgeHistory';
import { useTranslation } from 'react-i18next';
import { useRabbyDispatch } from '@/ui/store';
import { RabbyFeePopup } from '../../Swap/Component/RabbyFeePopup';
import { getUiType } from '@/ui/utils';
import { useHistory } from 'react-router-dom';
import { RcIconJumpBoldCC } from '@/ui/assets/dashboard';
import { BridgeQuoteCapturePanel } from './BridgeQuoteCapturePanel';
import {
  BRIDGE_QUOTE_CAPTURE_EVENT,
  getBridgeQuoteCaptureStats,
} from '../utils/quoteCapture';
const isTab = getUiType().isTab;
const isDesktop = getUiType().isDesktop;

const getContainer = isTab
  ? '.js-rabby-popup-container'
  : isDesktop
  ? '.js-rabby-desktop-swap-container'
  : undefined;

export const Header = ({
  onOpenInTab,
  noShowHeader,
  historyVisible,
  setHistoryVisible,
  showPending = false,
}: {
  onOpenInTab?(): void;
  noShowHeader: boolean;
  historyVisible: boolean;
  setHistoryVisible: (visible: boolean) => void;
  showPending?: boolean;
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
  const [quoteCaptureVisible, setQuoteCaptureVisible] = useState(false);
  const [validQuoteCount, setValidQuoteCount] = useState(0);

  useEffect(() => {
    if (!process.env.DEBUG) {
      return;
    }
    let cancelled = false;
    const load = () => {
      getBridgeQuoteCaptureStats()
        .then((stats) => {
          if (!cancelled) {
            setValidQuoteCount(stats.validQuoteCount);
          }
        })
        .catch(() => undefined);
    };
    load();
    window.addEventListener(BRIDGE_QUOTE_CAPTURE_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(BRIDGE_QUOTE_CAPTURE_EVENT, load);
    };
  }, []);

  return (
    <>
      {process.env.DEBUG && noShowHeader ? (
        <div className="flex justify-end px-[20px]">
          <div
            className="text-12 font-medium text-r-blue-default cursor-pointer"
            onClick={() => setQuoteCaptureVisible(true)}
          >
            Quotes {validQuoteCount}
          </div>
        </div>
      ) : null}
      {!noShowHeader && (
        <PageHeader
          className="mx-[20px] mb-[5px]"
          forceShowBack={!isTab}
          onBack={gotoDashboard}
          canBack={!isTab}
          isShowAccount
          rightSlot={
            <div className="flex items-center gap-[16px] absolute top-[50%] translate-y-[-50%] right-0">
              {process.env.DEBUG ? (
                <div
                  className="text-12 font-medium text-r-blue-default cursor-pointer whitespace-nowrap"
                  onClick={() => setQuoteCaptureVisible(true)}
                >
                  Quotes {validQuoteCount}
                </div>
              ) : null}
              {isTab ? null : (
                <div
                  className="text-r-neutral-title1 hover:text-r-blue-default cursor-pointer relative hit-slop-8"
                  onClick={() => {
                    onOpenInTab?.();
                  }}
                >
                  <RcIconJumpBoldCC />
                </div>
              )}
              <div
                className="relative hit-slop-8 cursor-pointer text-r-neutral-title1 hover:text-r-blue-default"
                onClick={openHistory}
              >
                {showPending ? (
                  <RcIconHistoryPending className="block [&_[data-pending-ring]]:animate-spin [&_[data-pending-ring]]:[animation-duration:1.5s]" />
                ) : (
                  <RcIconHistory />
                )}
              </div>
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
        getContainer={getContainer}
      />
      <RabbyFeePopup
        type="bridge"
        visible={feePopupVisible}
        onClose={closeFeePopup}
        getContainer={getContainer}
      />
      {process.env.DEBUG ? (
        <BridgeQuoteCapturePanel
          visible={quoteCaptureVisible}
          onClose={() => setQuoteCaptureVisible(false)}
        />
      ) : null}
    </>
  );
};
