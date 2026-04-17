import React from 'react';
import { Button, Modal } from 'antd';
import { useMemoizedFn } from 'ahooks';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { createGlobalStyle } from 'styled-components';

import { PageHeader } from '@/ui/component';
import { useSceneAccountInfo } from '@/ui/hooks/backgroundState/useAccount';
import {
  ApprovalSpenderItemToBeRevoked,
  AssetApprovalSpender,
} from '../ManageApprovals/hooks/useManageApprovalsPage';
import { findIndexRevokeList } from '../ManageApprovals/utils';
import { PerpsBlueBorderedButton } from '../Perps/components/BlueBorderedButton';
import { ListHeader } from './components/ListHeader';
import { ListItem } from './components/ListItem';
import {
  getBatchRevokeAccountMode,
  useBatchRevokeTask,
} from './hooks/useBatchRevokeTask';
import { RevokeActionButton } from './components/RevokeActionButton';
import { openInTab } from '@/ui/utils';
import { ReactComponent as RcIconFullscreen } from '@/ui/assets/fullscreen-cc.svg';

const GlobalStyle = createGlobalStyle`
.global-stop-revoke-modal {
  .ant-modal-content {
    border-radius: 12px !important;
    border: none !important;
    background-color: var(--r-neutral-bg-2, #f5f6fa) !important;
  }

  .ant-modal-confirm-btns {
    display: none !important;
  }

  .ant-modal-confirm-content {
    padding: 0 !important;
    background-color: var(--r-neutral-bg-2, #f5f6fa) !important;
  }
}
`;

export type BatchRevokePageState = {
  revokeList: ApprovalSpenderItemToBeRevoked[];
  dataSource: AssetApprovalSpender[];
};

export const ManageBatchRevokeApprovals: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation<BatchRevokePageState | undefined>();
  const { currentAccount } = useSceneAccountInfo();
  const allowNavigationRef = React.useRef(false);
  const batchRevokeState = location.state;
  const revokeList = batchRevokeState?.revokeList ?? [];
  const dataSource = batchRevokeState?.dataSource ?? [];
  const accountMode = React.useMemo(
    () => getBatchRevokeAccountMode(currentAccount?.type),
    [currentAccount?.type]
  );
  const filteredDataSource = React.useMemo(
    () =>
      dataSource.filter((record) => {
        return (
          findIndexRevokeList(revokeList, {
            item: record.$assetContract!,
            spenderHost: record.$assetToken!,
            assetApprovalSpender: record,
          }) > -1
        );
      }),
    [dataSource, revokeList]
  );
  const task = useBatchRevokeTask();

  React.useEffect(() => {
    if (!batchRevokeState) {
      history.replace('/revoke-approvals');
    }
  }, [batchRevokeState, history]);

  React.useEffect(() => {
    if (batchRevokeState && task.status === 'idle') {
      task.init(filteredDataSource, revokeList);
    }
  }, [batchRevokeState, filteredDataSource, revokeList, task]);

  const isPaused = task.status === 'paused';
  const processText = ` (${task.revokedApprovals}/${task.totalApprovals})`;

  const handleClose = React.useCallback(
    (needUpdate: boolean) => {
      if (needUpdate) {
        history.replace('/revoke-approvals');
        return;
      }

      history.goBack();
    },
    [history]
  );

  const handleCloseAttempt = useMemoizedFn(() => {
    const continueNavigation = () => {
      handleClose(task.status === 'completed');
    };

    if (task.status === 'idle' || task.status === 'completed') {
      continueNavigation();
      return;
    }

    task.pause();
    const modal = Modal.confirm({
      centered: true,
      width: 340,
      title: t('page.manageBatchApprovals.stopTheRevokeProcess'),
      content: (
        <div>
          <div className="text-[13px] leading-[16px] text-r-neutral-body mb-[36px]">
            {t(
              'page.manageBatchApprovals.leavingThisPageWillStopTheRevokeProcess'
            )}
          </div>
          <div className="flex items-center gap-[12px]">
            <PerpsBlueBorderedButton
              onClick={() => {
                modal.destroy();
              }}
              className="w-1/2 flex-1"
            >
              {t('global.Cancel')}
            </PerpsBlueBorderedButton>
            <Button
              type="primary"
              onClick={() => {
                modal.destroy();
                setTimeout(() => {
                  continueNavigation();
                }, 400);
              }}
              className="w-1/2 flex-1 h-[44px] text-[15px] leading-[18px] rounded-[8px]"
            >
              {t('global.Yes')}
            </Button>
          </div>
        </div>
      ),
      className: 'global-stop-revoke-modal',
    });
  });

  if (!batchRevokeState) {
    return null;
  }

  return (
    <>
      <GlobalStyle />
      <div className="h-full bg-r-neutral-bg-2 px-[20px] flex flex-col">
        <PageHeader
          onBack={handleCloseAttempt}
          rightSlot={
            <div className="flex items-center gap-[16px] ">
              <div
                className="relative cursor-pointer text-r-neutral-title1 hit-slop-8"
                onClick={() => {
                  openInTab('desktop.html#/desktop/manage-approvals');
                }}
              >
                <RcIconFullscreen />
              </div>
            </div>
          }
        >
          {t('page.manageBatchApprovals.title')}
        </PageHeader>
        <div className="flex-1 min-h-0 overflow-auto pb-[20px]">
          <div className="mx-auto rounded-[8px] bg-r-neutral-card1 py-[8px]">
            <ListHeader />

            <div>
              {task.list.map((item, index) => (
                <React.Fragment key={`${item.id}-${index}`}>
                  <ListItem
                    item={item}
                    isPaused={isPaused}
                    onStillRevoke={(record) => {
                      task.addRevokeTask(record, 0, true);
                      task.continue();
                    }}
                  />
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        <footer
          className={clsx(
            'border-t border-[0.5px] border-rabby-neutral-line',
            'mx-[-20px] px-[20px] py-[14px]'
          )}
        >
          <RevokeActionButton
            task={task}
            onDone={() => {
              history.replace('/revoke-approvals');
            }}
          />
        </footer>
      </div>
    </>
  );
};
