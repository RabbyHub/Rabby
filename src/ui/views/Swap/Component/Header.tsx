import { ReactComponent as RcIconSwapHistory } from '@/ui/assets/swap/history.svg';

import { PageHeader } from '@/ui/component';
import React, { useCallback, useState } from 'react';
import {
  usePollSwapPendingNumber,
  useRabbyFeeVisible,
  useSetRabbyFeeVisible,
} from '../hooks';
import { SwapTxHistory } from './History';
import { useTranslation } from 'react-i18next';
import { useRabbyDispatch } from '@/ui/store';
import { PendingTx } from '../../Bridge/Component/PendingTx';
import { RabbyFeePopup } from './RabbyFeePopup';

export const Header = () => {
  const [historyVisible, setHistoryVisible] = useState(false);
  const { t } = useTranslation();

  const loadingNumber = usePollSwapPendingNumber(5000);

  const rabbyFeeVisible = useRabbyFeeVisible();
  const setRabbyFeeVisible = useSetRabbyFeeVisible();

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
          </div>
        }
      >
        {t('page.swap.title')}
      </PageHeader>
      <SwapTxHistory
        visible={historyVisible}
        onClose={useCallback(() => {
          setHistoryVisible(false);
        }, [])}
      />
      <RabbyFeePopup
        visible={rabbyFeeVisible}
        onClose={() => setRabbyFeeVisible(false)}
      />
    </>
  );
};
