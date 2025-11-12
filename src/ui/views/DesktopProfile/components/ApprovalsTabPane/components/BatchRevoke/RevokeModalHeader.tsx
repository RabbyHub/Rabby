import React from 'react';
import { BatchRevokeTaskType } from './useBatchRevokeTask';
import { ReactComponent as LoadingSVG } from '@/ui/assets/address/loading.svg';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconCloseCC } from '@/ui/assets/component/close-cc.svg';
import { Modal } from '@/ui/component';
import { Button } from 'antd';
import clsx from 'clsx';

interface Props {
  totalApprovals: number;
  revokedApprovals: number;
  onClose: (needUpdate: boolean) => void;
  task: BatchRevokeTaskType;
}

export const RevokeModalHeader: React.FC<Props> = ({
  onClose,
  totalApprovals,
  revokedApprovals,
  task,
}) => {
  const { t } = useTranslation();
  const handleClose = React.useCallback(() => {
    if (task.status === 'idle') {
      return onClose(false);
    }
    if (task.status === 'completed') {
      return onClose(true);
    }

    task.pause();
    const modal = Modal.info({
      title: t('page.approvals.revokeModal.cancelTitle'),
      className: 'confirm-revoke-modal',
      closable: true,
      centered: true,
      width: 384,
      okCancel: false,
      content: (
        <div>
          <div className="text-r-neutral-body text-15 leading-[22px] text-center">
            {t('page.approvals.revokeModal.cancelBody')}
          </div>
          <footer className="mt-32">
            <Button
              type="primary"
              className={clsx(
                'w-full h-[44px]',
                'rounded-[6px]',
                'before:content-none'
              )}
              onClick={() => {
                onClose(true);
                modal.destroy();
              }}
            >
              {t('page.approvals.revokeModal.confirm')}
            </Button>
          </footer>
        </div>
      ),
    });
  }, [onClose, task.status]);

  return (
    <header className=" text-center relative">
      <div className="space-x-8 flex justify-center items-center">
        {(task.status === 'active' || task.status === 'paused') && (
          <LoadingSVG
            className={clsx(
              'text-r-blue-default',
              task.status === 'paused' ? 'loading-paused' : ''
            )}
          />
        )}
        <span className="text-24 font-medium text-r-neutral-title-1">
          {t('page.approvals.revokeModal.batchRevoke')} ({revokedApprovals}/
          {totalApprovals})
        </span>
      </div>
      <div className="text-r-neutral-foot text-15 font-normal mt-12">
        {t('page.approvals.revokeModal.revoked')}{' '}
        {t('page.approvals.revokeModal.approvalCount', {
          count: revokedApprovals,
        })}
        丨{t('page.approvals.revokeModal.totalRevoked')}{' '}
        {t('page.approvals.revokeModal.approvalCount', {
          count: totalApprovals,
        })}
      </div>

      <div
        className="p-20 absolute right-0 top-0 -mt-20 -mr-20 cursor-pointer"
        onClick={handleClose}
      >
        <RcIconCloseCC className="w-[24px] h-[24px] text-r-neutral-foot" />
      </div>
    </header>
  );
};
