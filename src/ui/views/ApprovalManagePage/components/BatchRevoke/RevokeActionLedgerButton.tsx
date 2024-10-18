import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { BatchRevokeTaskType } from './useBatchRevokeTask';
import { useLedgerStatus } from '@/ui/component/ConnectStatus/useLedgerStatus';
import { CommonAccount } from '@/ui/views/Approval/components/FooterBar/CommonAccount';
import { EVENTS, WALLET_BRAND_CONTENT } from '@/constant';
import { ReactComponent as LedgerPressSVG } from '@/ui/assets/ledger/press.svg';
import { Dots } from '@/ui/views/Approval/components/Popup/Dots';
import eventBus from '@/eventBus';
import { isLedgerLockError } from '@/ui/utils/ledger';
import { Ledger } from '@/ui/views/CommonPopup/Ledger';
import { Modal } from '@/ui/component';

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
  onDone: () => void;
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

    eventBus.addEventListener(EVENTS.LEDGER.REJECTED, listener);

    return () => {
      eventBus.removeEventListener(EVENTS.LEDGER.REJECTED, listener);
    };
  }, [task.addRevokeTask]);

  React.useEffect(() => {
    if (task.status === 'active' && status === 'DISCONNECTED') {
      eventBus.emit(EVENTS.LEDGER.REJECTED, 'DISCONNECTED');
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
      >
        <Ledger isModalContent />
      </Modal>
      <div className="flex justify-center flex-col items-center mt-40">
        {task.status === 'idle' && (
          <Button
            type="ghost"
            className={buttonGhostClass}
            onClick={task.start}
          >
            <CommonAccount
              icon={LegerIcon}
              className="items-center justify-center"
            >
              <span>{t('page.approvals.revokeModal.revokeWithLedger')}</span>
            </CommonAccount>
          </Button>
        )}

        {task.status === 'completed' && (
          <Button type="primary" className={buttonBaseClass} onClick={onDone}>
            {t('page.approvals.revokeModal.done')}
          </Button>
        )}

        {task.status === 'paused' && (
          <Button
            type="primary"
            className={buttonBaseClass}
            onClick={task.continue}
          >
            {t('page.approvals.revokeModal.resume')}
          </Button>
        )}
      </div>

      {task.status === 'active' && (
        <div className="-mx-32 -mb-40">
          {task.txStatus === 'sended' ? (
            <div
              className={clsx(
                ledgerButtonClass,
                'bg-r-blue-default',
                'text-r-neutral-title2'
              )}
            >
              <LedgerPressSVG />
              <span>
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
                ledgerButtonClass,
                'bg-r-neutral-card-2',
                'text-r-neutral-body'
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
                ledgerButtonClass,
                'bg-r-neutral-card-2',
                'text-r-neutral-body'
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
    </>
  );
};
