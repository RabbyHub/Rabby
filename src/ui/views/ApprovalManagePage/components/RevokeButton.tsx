import React, { useCallback, useEffect, useLayoutEffect } from 'react';
import { Button, Modal } from 'antd';
import { Trans, useTranslation } from 'react-i18next';
import { RevokeSummary } from '@/utils-isomorphic/approve';
import { modalCloseIcon20 } from '@/ui/component/Modal';
import { useWallet } from '@/ui/utils';

interface Props {
  isLoading?: boolean;
  revokeSummary: RevokeSummary;
  onRevoke: () => any | Promise<any>;
}

export const RevokeButton: React.FC<Props> = ({ revokeSummary, onRevoke }) => {
  const { t } = useTranslation();

  const [isRevokeLoading, setIsRevokeLoading] = React.useState(false);
  const wallet = useWallet();

  useLayoutEffect(() => {
    const onBodyFocus = async () => {
      const approval = await wallet.getApproval();
      if (!approval) {
        setIsRevokeLoading(false);
      }
    };

    document.body.addEventListener('focus', onBodyFocus);

    return () => {
      document.body.removeEventListener('focus', onBodyFocus);
    };
  }, [wallet]);

  const handleOnRevole = useCallback(async () => {
    if (isRevokeLoading) return;

    try {
      setIsRevokeLoading(true);
      await onRevoke();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRevokeLoading(false);
    }
  }, [onRevoke]);

  const handleRevoke = React.useCallback(() => {
    const hasPackedPermit2Sign = Object.values(
      revokeSummary.permit2Revokes
    ).some((x) => x.tokenSpenders.length > 1);

    if (!hasPackedPermit2Sign) {
      return handleOnRevole();
    }

    Modal.info({
      closable: true,
      closeIcon: modalCloseIcon20,
      className: 'am-revoke-info-modal modal-support-darkmode',
      centered: true,
      title: (
        <h2 className="text-r-neutral-title1 text-[20px] font-[600] break-words">
          <Trans
            i18nKey="page.approvals.component.RevokeButton.permit2Batch.modalTitle"
            values={{ count: revokeSummary.statics.txCount }}
          >
            A total of{' '}
            <span className="text-r-blue-default">
              {revokeSummary.statics.txCount}
            </span>{' '}
            signature is required
          </Trans>
        </h2>
      ),
      content: (
        <p className="text-r-neutral-body text-center mb-0 text-[15px] font-normal leading-[normal]">
          {t('page.approvals.component.RevokeButton.permit2Batch.modalContent')}
        </p>
      ),
      onOk: () => {
        handleOnRevole();
      },
      okText: t('global.confirm'),
      okButtonProps: {
        className: 'w-[100%] h-[44px]',
      },
    });
  }, [handleOnRevole, t]);

  const revokeTxCount = revokeSummary.statics.txCount;
  const spenderCount = revokeSummary.statics.spenderCount;

  return (
    <>
      {revokeTxCount > 1 ? (
        <div className="mt-[16px] h-[16px] mb-[16px] text-13 leading-[15px] text-r-neutral-body">
          {revokeTxCount} transaction(s) to be signed sequentially
        </div>
      ) : (
        <div className="mt-[16px] h-[16px] mb-[16px]"> </div>
      )}
      <Button
        loading={isRevokeLoading}
        className="w-[280px] h-[60px] text-[20px] am-revoke-btn"
        type="primary"
        size="large"
        disabled={!revokeTxCount}
        onClick={handleRevoke}
      >
        {t('page.approvals.component.RevokeButton.btnText', {
          count: spenderCount,
        })}
      </Button>
    </>
  );
};
