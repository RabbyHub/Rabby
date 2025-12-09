import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useRabbyDispatch } from '@/ui/store';
import { EVENTS, KEYRING_TYPE } from '@/constant';
import { useRequest } from 'ahooks';
import { useEventBusListener } from '@/ui/hooks/useEventBusListener';
import { RcIconSpinCC } from '@/ui/assets/desktop/profile';
import React from 'react';

export const DesktopPending = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const currentAccount = useCurrentAccount();
  const isGnosis = currentAccount?.type === KEYRING_TYPE.GnosisKeyring;
  const dispatch = useRabbyDispatch();

  const { data: pendingTxCount, runAsync } = useRequest(
    async () => {
      if (!currentAccount?.address || isGnosis) {
        return;
      }
      return dispatch.transactions.getPendingTxCountAsync(
        currentAccount?.address
      );
    },
    {
      refreshDeps: [currentAccount?.address, isGnosis],
      refreshOnWindowFocus: true,
      pollingInterval: 30_000,
    }
  );

  useEventBusListener(EVENTS.TX_SUBMITTING, () => {
    setTimeout(() => {
      runAsync();
    }, 800);
  });
  useEventBusListener(EVENTS.RELOAD_TX, runAsync);

  if (isGnosis || !pendingTxCount) {
    return null;
  }
  return (
    <>
      <div
        className={clsx(
          'min-w-[112px] py-[8px] px-[10px] rounded-[8px]',
          'flex items-center justify-center gap-[8px] cursor-pointer',
          'text-[14px] font-semibold text-r-orange-default',
          'bg-rb-orange-light-1'
        )}
        onClick={() => {
          history.replace(history.location.pathname + '?action=activities');
        }}
      >
        <RcIconSpinCC className="w-[16px] h-[16px] animate-spin" />
        <div>{t('page.desktopProfile.button.pending', { pendingTxCount })}</div>
      </div>
    </>
  );
};
