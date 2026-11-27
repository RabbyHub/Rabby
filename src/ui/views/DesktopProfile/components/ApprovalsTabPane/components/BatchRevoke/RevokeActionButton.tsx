import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { BatchRevokeTaskType } from './useBatchRevokeTask';

const buttonBaseClass = clsx(
  'rounded-[6px] h-[48px] w-[252px]',
  'before:content-none',
  'text-[16px]'
);

export const RevokeActionButton: React.FC<{
  task: BatchRevokeTaskType;
  onDone: () => void;
}> = ({ task, onDone }) => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-center mt-40">
      {task.status === 'idle' && (
        <Button type="primary" className={buttonBaseClass} onClick={task.start}>
          {t('page.approvals.revokeModal.signAndStartRevoke')}
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
        <Button
          type="ghost"
          className={clsx(
            buttonBaseClass,
            'border-r-blue-default text-r-blue-default',
            'hover:bg-r-blue-light-1 active:bg-r-neutral-black/10'
          )}
          onClick={task.pause}
        >
          {t('page.approvals.revokeModal.pause')}
        </Button>
      )}
    </div>
  );
};
