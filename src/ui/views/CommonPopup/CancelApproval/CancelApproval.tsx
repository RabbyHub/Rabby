import { useCommonPopupView, useWallet } from '@/ui/utils';
import React from 'react';
import { CancelItem } from './CancelItem';
import { useTranslation } from 'react-i18next';

export const CancelApproval = () => {
  const { data, setTitle, setHeight, closePopup } = useCommonPopupView();
  const {
    onCancel,
    displayBlockedRequestApproval,
    displayCancelAllApproval,
  } = data;
  const wallet = useWallet();
  const [pendingApprovalCount, setPendingApprovalCount] = React.useState(0);
  const { t } = useTranslation();

  React.useEffect(() => {
    setTitle(t('page.signFooterBar.cancelTransaction'));
    if (displayBlockedRequestApproval && displayCancelAllApproval) {
      setHeight(288);
    } else {
      setHeight(244);
    }
    wallet.getPendingApprovalCount().then(setPendingApprovalCount);
  }, [displayBlockedRequestApproval, displayCancelAllApproval]);

  const handleCancelAll = () => {
    wallet.rejectAllApprovals();
  };

  const handleBlockedRequestApproval = () => {
    wallet.blockedDapp();
  };

  const handleCancel = () => {
    onCancel();
    closePopup();
  };

  return (
    <div>
      <div className="text-r-neutral-body text-13 font-normal text-center leading-[16px]">
        {t('page.signFooterBar.detectedMultipleRequestsFromThisDapp')}
      </div>
      <div className="space-y-12 mt-20">
        <CancelItem onClick={handleCancel}>
          {t('page.signFooterBar.cancelCurrentTransaction')}
        </CancelItem>
        {displayCancelAllApproval && (
          <CancelItem onClick={handleCancelAll}>
            {t('page.signFooterBar.cancelAll', {
              count: pendingApprovalCount,
            })}
          </CancelItem>
        )}
        {displayBlockedRequestApproval && (
          <CancelItem onClick={handleBlockedRequestApproval}>
            {t('page.signFooterBar.blockDappFromSendingRequests')}
          </CancelItem>
        )}
      </div>
    </div>
  );
};
