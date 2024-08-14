import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { BatchRevokeTaskType } from './useBatchRevokeTask';
import { openInternalPageInTab } from '@/ui/utils';
import { useLedgerStatus } from '@/ui/component/ConnectStatus/useLedgerStatus';
import { CommonAccount } from '@/ui/views/Approval/components/FooterBar/CommonAccount';
import { WALLET_BRAND_CONTENT } from '@/constant';
import { ReactComponent as LedgerPressSVG } from '@/ui/assets/ledger/press.svg';
import { Dots } from '@/ui/views/Approval/components/Popup/Dots';

const buttonBaseClass = clsx(
  'rounded-[6px] h-[48px] w-[252px]',
  'before:content-none',
  'text-[16px]',
  'mt-40'
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
  'text-[16px] font-medium'
);

const LegerIcon = WALLET_BRAND_CONTENT.LEDGER.icon;

export const RevokeActionLedgerButton: React.FC<{
  task: BatchRevokeTaskType;
  onDone: () => void;
}> = ({ task, onDone }) => {
  const { t } = useTranslation();
  const { status } = useLedgerStatus();
  const { totalApprovals, revokedApprovals } = task;

  const handleClickConnectLedger = async () => {
    openInternalPageInTab('request-permission?type=ledger', true, false);
  };

  const signal = React.useMemo(() => {
    switch (status) {
      case undefined:
      case 'DISCONNECTED':
        return 'DISCONNECTED';

      default:
        return 'CONNECTED';
    }
  }, [status]);

  return (
    <>
      <div className="flex justify-center">
        {task.status === 'idle' && (
          <Button
            {...(status === 'DISCONNECTED'
              ? {
                  type: 'ghost',
                  className: buttonGhostClass,
                  onClick: handleClickConnectLedger,
                }
              : {
                  type: 'primary',
                  className: buttonBaseClass,
                  onClick: task.start,
                })}
          >
            <CommonAccount
              signal={signal}
              icon={LegerIcon}
              className="items-center justify-center"
            >
              <span>
                {status === 'DISCONNECTED'
                  ? t('page.approvals.revokeModal.connectLedger')
                  : t('page.approvals.revokeModal.revokeWithLedger')}
              </span>
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
                {t('page.approvals.revokeModal.ledgerRequest', {
                  current: revokedApprovals + 1,
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
                  current: revokedApprovals + 1,
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
