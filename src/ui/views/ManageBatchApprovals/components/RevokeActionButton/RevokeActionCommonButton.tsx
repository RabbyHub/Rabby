import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { BatchRevokeTaskType } from '../../hooks/useBatchRevokeTask';

export const RevokeActionCommonButton: React.FC<{
  task: BatchRevokeTaskType;
  onDone?: () => void;
}> = ({ task, onDone }) => {
  const { t } = useTranslation();
  const history = useHistory();
  const processText = ` (${task.revokedApprovals}/${task.totalApprovals})`;

  const footerButton = React.useMemo(() => {
    switch (task.status) {
      case 'paused':
        return {
          title: t('page.manageBatchApprovals.continueRevoke') + processText,
          onClick: () => task.continue(),
          type: 'primary' as const,
          className: '',
        };
      case 'active':
        return {
          title: t('page.manageBatchApprovals.pauseRevoke') + processText,
          onClick: () => task.pause(),
          type: 'default' as const,
          className:
            'before:hidden border border-rabby-blue-default bg-transparent text-r-blue-default hover:bg-r-blue-light1',
        };
      case 'completed':
        return {
          title: t('page.manageBatchApprovals.revokeCompleted') + processText,
          onClick: () => {
            onDone?.();
          },
          type: 'primary' as const,
          className: '',
        };
      case 'idle':
      default:
        return {
          title: t('page.manageBatchApprovals.startRevoke') + processText,
          onClick: () => task.start(),
          type: 'primary' as const,
          className: '',
        };
    }
  }, [history, processText, t, task]);

  return (
    <Button
      block
      size="large"
      type={footerButton.type}
      className={clsx(
        'h-[44px] rounded-[8px] text-[15px] leading-[18px]',
        footerButton.className
      )}
      onClick={footerButton.onClick}
    >
      {footerButton.title}
    </Button>
  );
};
