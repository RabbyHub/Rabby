import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { BatchRevokeTaskType } from './useBatchRevokeTask';
import { openInternalPageInTab } from '@/ui/utils';
import { useLedgerStatus } from '@/ui/component/ConnectStatus/useLedgerStatus';
import { CommonAccount } from '@/ui/views/Approval/components/FooterBar/CommonAccount';
import { WALLET_BRAND_CONTENT } from '@/constant';

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

const LegerIcon = WALLET_BRAND_CONTENT.LEDGER.icon;

export const RevokeActionLedgerButton: React.FC<{
  task: BatchRevokeTaskType;
  onDone: () => void;
}> = ({ task, onDone }) => {
  const { t } = useTranslation();
  const { status } = useLedgerStatus();

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

  if (status === 'DISCONNECTED') {
    return (
      <Button
        type="ghost"
        className={buttonGhostClass}
        onClick={handleClickConnectLedger}
      >
        <CommonAccount
          signal={signal}
          icon={LegerIcon}
          className="items-center justify-center"
        >
          <span>{t('page.approvals.revokeModal.connectLedger')}</span>
        </CommonAccount>
      </Button>
    );
  }

  return (
    <>
      {task.status === 'idle' && (
        <Button type="primary" className={buttonBaseClass} onClick={task.start}>
          <CommonAccount
            signal={signal}
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

      {task.status === 'active' && (
        <Button type="ghost" className={buttonGhostClass} onClick={task.pause}>
          {t('page.approvals.revokeModal.pause')}
        </Button>
      )}
    </>
  );
};
