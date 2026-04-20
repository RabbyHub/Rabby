import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOneKeyStatus } from '@/ui/component/ConnectStatus/useOneKeyStatus';
import { CommonAccount } from '@/ui/views/Approval/components/FooterBar/CommonAccount';
import { EVENTS, WALLET_BRAND_CONTENT } from '@/constant';
import { ReactComponent as OnekeyPressSVG } from '@/ui/assets/onekey-press.svg';
import { Dots } from '@/ui/views/Approval/components/Popup/Dots';
import eventBus from '@/eventBus';
import { OneKey } from '@/ui/views/CommonPopup/OneKey';
import { Popup } from '@/ui/component';
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

const OnekeyIcon = WALLET_BRAND_CONTENT.ONEKEY.icon;

export const RevokeActionOnekeyButton: React.FC<{
  task: BatchRevokeTaskType;
  onDone?: () => void;
}> = ({ task, onDone }) => {
  const { t } = useTranslation();
  const { totalApprovals, currentApprovalIndex } = task;
  const { status, checkStatus } = useOneKeyStatus({
    enabled: task.status === 'active',
  });

  const [disconnectTipsModal, setDisconnectTipsModal] = React.useState(false);
  const handledDisconnectRef = React.useRef(false);

  React.useEffect(() => {
    const listener = (msg) => {
      if (msg === 'DISCONNECTED' || msg.startsWith('901:')) {
        handledDisconnectRef.current = true;
        setDisconnectTipsModal(true);
        task?.pause();
      }
    };

    eventBus.addEventListener(EVENTS.COMMON_HARDWARE.REJECTED, listener);

    return () => {
      eventBus.removeEventListener(EVENTS.COMMON_HARDWARE.REJECTED, listener);
    };
  }, [task]);

  React.useEffect(() => {
    if (task.status !== 'active') {
      handledDisconnectRef.current = false;
      return;
    }

    if (status === 'DISCONNECTED' && !handledDisconnectRef.current) {
      handledDisconnectRef.current = true;
      eventBus.emit(EVENTS.COMMON_HARDWARE.REJECTED, 'DISCONNECTED');
    }
  }, [status, task.status]);

  return (
    <>
      <Popup
        height={'fit-content'}
        visible={disconnectTipsModal}
        closable
        onCancel={() => {
          // setDirectSigning(false);
          setDisconnectTipsModal(false);
          // props.onCancel?.();
        }}
        title={t('page.dashboard.hd.onekeyIsDisconnected')}
        maskStyle={{
          backgroundColor: 'transparent',
        }}
        // getContainer={getContainer}
        push={false}
      >
        <OneKey isModalContent />
      </Popup>
      <div className="flex justify-center flex-col items-center">
        {task.status === 'idle' && (
          <Button
            type="primary"
            className="h-[44px] rounded-[8px] text-[15px] leading-[18px]"
            onClick={async () => {
              const isReady = await checkStatus();
              if (isReady) {
                task.start();
              } else {
                setDisconnectTipsModal(true);
              }
            }}
            block
          >
            <CommonAccount
              icon={OnekeyIcon}
              className="items-center justify-center"
            >
              <span>
                {t('page.approvals.revokeModal.revokeWithOneKey')} (
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
                <OnekeyPressSVG className="mr-[8px]" />
                <span className="text-[13px] leading-[16px] font-medium">
                  {t('page.approvals.revokeModal.oneKeySended', {
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
                  {t('page.approvals.revokeModal.oneKeySigned', {
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
                  {t('page.approvals.revokeModal.oneKeySending', {
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
