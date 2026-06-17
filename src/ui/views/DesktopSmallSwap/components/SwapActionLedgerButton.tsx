import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
// import { BatchRevokeTaskType } from './useBatchRevokeTask';
import { useLedgerStatus } from '@/ui/component/ConnectStatus/useLedgerStatus';
import { CommonAccount } from '@/ui/views/Approval/components/FooterBar/CommonAccount';
import { EVENTS, WALLET_BRAND_CONTENT } from '@/constant';
import { ReactComponent as LedgerPressSVG } from '@/ui/assets/ledger/press.svg';
import { Dots } from '@/ui/views/Approval/components/Popup/Dots';
import eventBus from '@/eventBus';
import { isLedgerLockError } from '@/ui/utils/ledger';
import { Ledger } from '@/ui/views/CommonPopup/Ledger';
import { Modal } from '@/ui/component';
import { BatchSwapTaskType } from '../hooks/useBatchSwapTask';
import { LoadingOutlined } from '@ant-design/icons';

const buttonBaseClass = clsx(
  'rounded-[6px] h-[48px] w-[252px]',
  'before:content-none',
  'text-[16px]'
);

const buttonGhostClass = clsx(
  buttonBaseClass,
  'border-blue-light text-blue-light',
  'hover:bg-[#8697FF1A] active:bg-[#0000001A]'
);

const ledgerButtonClass = clsx(
  'h-80',
  'flex items-center justify-center',
  'gap-x-6',
  'text-[16px] font-medium',
  'mt-8'
);

const LegerIcon = WALLET_BRAND_CONTENT.LEDGER.icon;

export const SwapActionLedgerButton: React.FC<{
  task: BatchSwapTaskType;
  onDone: () => void;
}> = ({ task, onDone }) => {
  const { t } = useTranslation();
  const { status } = useLedgerStatus();
  const currentApprovalIndex = task.currentTaskIndex;
  const totalApprovals = task?.list?.length || 1;
  const [
    visibleLedgerConnectModal,
    setVisibleLedgerConnectModal,
  ] = React.useState(false);

  React.useEffect(() => {
    const listener = (msg) => {
      if (isLedgerLockError(msg) || msg === 'DISCONNECTED') {
        setVisibleLedgerConnectModal(true);
        task.pause();

        if (msg !== 'DISCONNECTED') {
          task.addTask(task.currentApprovalRef.current!, 1);
        }
      }
    };

    eventBus.addEventListener(EVENTS.COMMON_HARDWARE.REJECTED, listener);

    return () => {
      eventBus.removeEventListener(EVENTS.COMMON_HARDWARE.REJECTED, listener);
    };
  }, [task.addTask]);

  React.useEffect(() => {
    if (task.status === 'active' && status === 'DISCONNECTED') {
      eventBus.emit(EVENTS.COMMON_HARDWARE.REJECTED, 'DISCONNECTED');
    }
  }, [task.status, status]);

  return (
    <>
      <Modal
        className="confirm-revoke-modal ledger-modal"
        width={400}
        visible={visibleLedgerConnectModal}
        onCancel={() => setVisibleLedgerConnectModal(false)}
        title={t('page.dashboard.hd.ledgerIsDisconnected')}
        zIndex={10000}
      >
        <Ledger isModalContent />
      </Modal>
      <div>
        {task.status === 'idle' && (
          <Button
            disabled={!task?.list?.length}
            type="primary"
            onClick={task.start}
            block
            className="flex-1 flex items-center justify-center gap-[8px] h-[60px] rounded-[8px] font-medium text-[18px] leading-[20px]"
          >
            <img src={LegerIcon} className="size-[24px]" />
            <div>{t('page.desktopSmallSwap.LedgerBtn.start')}</div>
          </Button>
        )}

        {task.status === 'paused' && (
          <Button
            type="primary"
            block
            className="flex-1 h-[60px] rounded-[8px] text-[18px] leading-[20px]"
            onClick={task.continue}
          >
            {t('page.desktopSmallSwap.LedgerBtn.continue')}
          </Button>
        )}
      </div>

      {task.status === 'active' && (
        <div>
          {task.txStatus === 'sended' ? (
            <div
              className={clsx(
                'flex items-center justify-center gap-[8px] h-[60px] rounded-[8px] font-medium text-[18px] leading-[20px]',
                'bg-r-blue-default text-r-neutral-title-2'
              )}
            >
              <div className="relative">
                <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                  <LoadingOutlined className="text-r-neutral-title-2 text-[32px]" />
                </div>
                <img src={LegerIcon} className="size-[24px]" />
              </div>
              <div>{t('page.desktopSmallSwap.LedgerBtn.confirm')}</div>
              {/* <Dots /> */}
            </div>
          ) : task.txStatus === 'signed' ? (
            <div
              className={clsx(
                'flex items-center justify-center gap-[8px] h-[60px] rounded-[8px] font-medium text-[18px] leading-[20px]',
                'bg-r-neutral-card-2',
                'text-r-neutral-body'
              )}
            >
              <div className="relative">
                <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                  <LoadingOutlined className="text-r-blue-default text-[32px]" />
                </div>
                <img src={LegerIcon} className="size-[24px]" />
              </div>
              <div>{t('page.desktopSmallSwap.LedgerBtn.send')}</div>
              {/* <Dots /> */}
            </div>
          ) : (
            <div
              className={clsx(
                'flex items-center justify-center gap-[8px] h-[60px] rounded-[8px] font-medium text-[18px] leading-[20px]',
                'bg-r-neutral-card-2',
                'text-r-neutral-body'
              )}
            >
              <div className="relative">
                <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                  <LoadingOutlined className="text-r-blue-default text-[32px]" />
                </div>
                <img src={LegerIcon} className="size-[24px]" />
              </div>
              <div>{t('page.desktopSmallSwap.LedgerBtn.send')}</div>
              {/* <Dots /> */}
            </div>
          )}
        </div>
      )}
    </>
  );
};
