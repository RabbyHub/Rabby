import React from 'react';
import { BatchSwapTaskType } from '../hooks/useBatchSwapTask';
import { Button, Tooltip } from 'antd';
import { Account } from '@/background/service/preference';
import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { SwapActionLedgerButton } from './SwapActionLedgerButton';

export const SwapActionButton: React.FC<{
  task?: BatchSwapTaskType | null;
  account?: Account | null;
}> = ({ task, account }) => {
  const isSupported = !!([
    KEYRING_TYPE.HdKeyring,
    KEYRING_TYPE.SimpleKeyring,
    KEYRING_CLASS.HARDWARE.LEDGER,
  ] as string[]).includes(account?.type || '');

  const { t } = useTranslation();

  if (!task) {
    return null;
  }

  if (account?.type === KEYRING_CLASS.HARDWARE.LEDGER) {
    return <SwapActionLedgerButton task={task} onDone={() => {}} />;
  }
  return (
    <>
      {task?.status === 'idle' ? (
        isSupported ? (
          <Button
            disabled={!task?.list?.length}
            type="primary"
            block
            className="flex-1 h-[60px] rounded-[8px] text-[18px] leading-[20px]"
            onClick={() => {
              task?.start();
            }}
          >
            {t('page.desktopSmallSwap.startConvert')}
          </Button>
        ) : (
          <Tooltip
            title={t('page.desktopSmallSwap.unsupportedWalletType')}
            placement="top"
            overlayClassName="rectangle"
          >
            <div className="flex-1">
              <Button
                disabled={true}
                type="primary"
                block
                className="h-[60px] rounded-[8px] text-[18px] leading-[20px]"
              >
                {t('page.desktopSmallSwap.startConvert')}
              </Button>
            </div>
          </Tooltip>
        )
      ) : (
        <button
          type="button"
          className={clsx(
            'w-full h-[60px] rounded-[8px] transition-opacity',
            'text-[18px] leading-[20px] font-medium text-r-neutral-title2',
            'bg-r-red-default'
          )}
          onClick={() => {
            task?.pause();
          }}
        >
          {t('page.desktopSmallSwap.stop')}
        </button>
      )}
    </>
  );
};
