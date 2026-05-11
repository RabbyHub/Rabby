import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLedgerStatus } from '@/ui/component/ConnectStatus/useLedgerStatus';
import { CommonAccount } from '@/ui/views/Approval/components/FooterBar/CommonAccount';
import { EVENTS, WALLET_BRAND_CONTENT } from '@/constant';
import { ReactComponent as LedgerPressSVG } from '@/ui/assets/ledger/press.svg';
import { Dots } from '@/ui/views/Approval/components/Popup/Dots';
import eventBus from '@/eventBus';
import { isLedgerLockError } from '@/ui/utils/ledger';
import { Ledger } from '@/ui/views/CommonPopup/Ledger';
import { Modal, Popup } from '@/ui/component';
import { BatchRevokeTaskType } from '../../hooks/useBatchRevokeTask';

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

export const RevokeActionLedgerButton: React.FC<{
  task: BatchRevokeTaskType;
  onDone?: () => void;
}> = ({ task, onDone }) => {
  const { t } = useTranslation();
  const { status } = useLedgerStatus();
  const { totalApprovals, currentApprovalIndex } = task;
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
          task.addRevokeTask(task.currentApprovalRef.current!, 1);
        }
      }
    };

    eventBus.addEventListener(EVENTS.COMMON_HARDWARE.REJECTED, listener);

    return () => {
      eventBus.removeEventListener(EVENTS.COMMON_HARDWARE.REJECTED, listener);
    };
  }, [task.addRevokeTask]);

  React.useEffect(() => {
    if (task.status === 'active' && status === 'DISCONNECTED') {
      eventBus.emit(EVENTS.COMMON_HARDWARE.REJECTED, 'DISCONNECTED');
    }
  }, [task.status, status]);

  return (
    <>
      <Popup
        height={320}
        visible={visibleLedgerConnectModal}
        closable
        onCancel={() => {
          // setDirectSigning(false);
          setVisibleLedgerConnectModal(false);
          // props.onCancel?.();
        }}
        title={t('page.dashboard.hd.ledgerIsDisconnected')}
        maskStyle={{
          backgroundColor: 'transparent',
        }}
        // getContainer={getContainer}
        push={false}
      >
        <Ledger isModalContent />
      </Popup>
      <div className="flex justify-center flex-col items-center">
        {task.status === 'idle' && (
          <Button
            type="primary"
            className="h-[44px] rounded-[8px] text-[15px] leading-[18px]"
            onClick={task.start}
            block
          >
            <CommonAccount
              icon={LegerIcon}
              className="items-center justify-center"
            >
              <span>
                {t('page.approvals.revokeModal.revokeWithLedger')} (
                {currentApprovalIndex + 1}/{task.totalApprovals})
              </span>
            </CommonAccount>
          </Button>
        )}

        {task.status === 'completed' && (
          <Button
            type="primary"
            block
            className="h-[44px] rounded-[8px] text-[15px] leading-[18px]"
            onClick={onDone}
          >
            {t('page.approvals.revokeModal.done')}
          </Button>
        )}

        {task.status === 'paused' && (
          <Button
            type="primary"
            block
            className="h-[44px] rounded-[8px] text-[15px] leading-[18px]"
            onClick={task.continue}
          >
            {t('page.approvals.revokeModal.resume')}
          </Button>
        )}
      </div>

      <Popup
        height={72}
        open={task.status === 'active'}
        maskStyle={{
          backgroundColor: 'transparent',
        }}
        // getContainer={getContainer}
        bodyStyle={{
          padding: 0,
        }}
        push={false}
        onCancel={() => {
          task.pause();
        }}
      >
        {task.status === 'active' && (
          <div className="">
            {task.txStatus === 'sended' ? (
              <div
                className={clsx(
                  'flex items-center justify-center',
                  'px-[20px] py-[20px] rounded-t-[16px] bg-r-blue-default',
                  'text-r-neutral-title2'
                )}
              >
                <LedgerPressSVG
                  viewBox="0 0 110 44"
                  className="w-[80px] h-[32px] mr-[8px]"
                />
                <span className="text-[13px] leading-[16px] font-medium">
                  {t('page.approvals.revokeModal.ledgerSended', {
                    current: currentApprovalIndex + 1,
                    total: totalApprovals,
                  })}
                </span>
                <Dots />
              </div>
            ) : task.txStatus === 'signed' ? (
              <div
                className={clsx(
                  'flex items-center justify-center rounded-t-[16px]',
                  'h-[72px] bg-r-neutral-bg-1',
                  'text-[15px] leading-[18px] font-medium text-r-neutral-title-1'
                )}
              >
                <span>
                  {t('page.approvals.revokeModal.ledgerSigned', {
                    current: currentApprovalIndex + 1,
                    total: totalApprovals,
                  })}
                </span>
                <Dots />
              </div>
            ) : (
              <div
                className={clsx(
                  'flex items-center justify-center rounded-t-[16px]',
                  'h-[72px] bg-r-neutral-bg-1',
                  'text-[15px] leading-[18px] font-medium text-r-neutral-title-1'
                )}
              >
                <span>
                  {t('page.approvals.revokeModal.ledgerSending', {
                    current: currentApprovalIndex + 1,
                    total: totalApprovals,
                  })}
                </span>
                <Dots />
              </div>
            )}
          </div>
        )}
      </Popup>
    </>
  );
};
