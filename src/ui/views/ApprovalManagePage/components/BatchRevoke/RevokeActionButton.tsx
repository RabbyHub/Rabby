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
    <>
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
            'border-blue-light text-blue-light',
            'hover:bg-[#8697FF1A] active:bg-[#0000001A]'
          )}
          onClick={task.pause}
        >
          {t('page.approvals.revokeModal.pause')}
        </Button>
      )}
    </>
  );
};
