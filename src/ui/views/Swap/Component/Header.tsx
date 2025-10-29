import { ReactComponent as RcIconSwapHistory } from '@/ui/assets/swap/history.svg';

import { PageHeader } from '@/ui/component';
import React, { useCallback, useState } from 'react';
import { useRabbyFee, useSetRabbyFee } from '../hooks';
import { SwapTxHistory } from './History';
import { useTranslation } from 'react-i18next';
import { useRabbyDispatch } from '@/ui/store';
import { RabbyFeePopup } from './RabbyFeePopup';
import { useHistory } from 'react-router-dom';
import { getUiType } from '@/ui/utils';
import { ReactComponent as RcIconFullscreen } from '@/ui/assets/fullscreen-cc.svg';
const isTab = getUiType().isTab;
const isDesktop = getUiType().isDesktop;
const getContainer =
  isTab || isDesktop ? '.js-rabby-desktop-swap-container' : undefined;

export const Header = ({
  onOpenInTab,
  noShowHeader = false,
}: {
  onOpenInTab?(): void;
  noShowHeader: boolean;
}) => {
  const [historyVisible, setHistoryVisible] = useState(false);
  const { t } = useTranslation();

  const { visible, feeDexDesc, dexName } = useRabbyFee();
  const setRabbyFeeVisible = useSetRabbyFee();

  const openHistory = useCallback(() => {
    setHistoryVisible(true);
  }, []);
  const history = useHistory();

  const gotoDashboard = () => {
    history.push('/dashboard');
  };

  const dispath = useRabbyDispatch();

  React.useEffect(() => {
    dispath.swap.getSwapSupportedDEXList();
  }, []);

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
              <RcIconSwapHistory
                className="cursor-pointer"
                onClick={openHistory}
              />
            </div>
          }
        >
          {t('page.swap.title')}
        </PageHeader>
      )}
      <SwapTxHistory
        visible={historyVisible}
        onClose={useCallback(() => {
          setHistoryVisible(false);
        }, [])}
        getContainer={getContainer}
      />
      <RabbyFeePopup
        visible={visible}
        dexName={dexName}
        feeDexDesc={feeDexDesc}
        onClose={() => setRabbyFeeVisible({ visible: false })}
        getContainer={getContainer}
      />
    </>
  );
};
