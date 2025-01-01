import { Button } from 'antd';
import React from 'react';
import './style.less';
import clsx from 'clsx';
import { Modal } from '@/ui/component';
import { useTranslation } from 'react-i18next';
import { KEYRING_CLASS } from '@/constant';

export const useConfirmRevokeModal = (props: {
  revokeListCount: number;
  onBatchRevoke: () => void;
  onRevokeOneByOne: () => void;
  accountType?: string;
}) => {
  const { t } = useTranslation();

  const show = React.useCallback(() => {
    const modal = Modal.info({
      title: t('page.approvals.revokeModal.confirmTitle'),
      className: 'confirm-revoke-modal',
      closable: true,
      centered: true,
      width: 420,
      okCancel: false,
      content: (
        <div>
          <div className="text-r-neutral-body text-15 leading-[22px]">
            {props.accountType === KEYRING_CLASS.HARDWARE.LEDGER
              ? t('page.approvals.revokeModal.confirmRevokeLedger', {
                  count: props.revokeListCount,
                })
              : t('page.approvals.revokeModal.confirmRevokePrivateKey', {
                  count: props.revokeListCount,
                })}
          </div>
          <footer className="flex flex-col gap-16 mx-auto mt-24 items-center">
            <Button
              type="primary"
              className={clsx(
                'w-[260px] h-[44px]',
                'rounded-[8px]',
                'before:content-none'
              )}
              onClick={() => {
                props.onBatchRevoke();
                modal.destroy();
              }}
            >
              {t('page.approvals.revokeModal.batchRevoke')}
            </Button>
            <Button
              type="ghost"
              className={clsx(
                'w-[260px] h-[44px] border-blue-light text-blue-light',
                'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
                'rounded-[8px]',
                'before:content-none'
              )}
              onClick={() => {
                props.onRevokeOneByOne();
                modal.destroy();
              }}
            >
              {t('page.approvals.revokeModal.revokeOneByOne')}
            </Button>
          </footer>
        </div>
      ),
    });
  }, [props]);

  return {
    show,
  };
};
