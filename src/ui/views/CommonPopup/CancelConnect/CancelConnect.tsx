import { useCommonPopupView, useWallet } from '@/ui/utils';
import React from 'react';
import { CancelItem } from '../CancelApproval/CancelItem';
import { useTranslation } from 'react-i18next';

export const CancelConnect = () => {
  const { data, setTitle, setHeight } = useCommonPopupView();
  const { onCancel, displayBlockedRequestApproval } = data;
  const wallet = useWallet();
  const { t } = useTranslation();

  React.useEffect(() => {
    setTitle(t('page.signFooterBar.cancelConnection'));

    setHeight(244);
  }, [displayBlockedRequestApproval]);

  const handleBlockedRequestApproval = () => {
    wallet.blockedDapp();
  };

  return (
    <div>
      <div className="text-r-neutral-body text-13 font-normal text-center leading-[16px]">
        {t('page.signFooterBar.detectedMultipleRequestsFromThisDapp')}
      </div>
      <div className="space-y-10 mt-20">
        <CancelItem onClick={onCancel}>
          {t('page.signFooterBar.cancelCurrentConnection')}
        </CancelItem>
        {displayBlockedRequestApproval && (
          <CancelItem onClick={handleBlockedRequestApproval}>
            {t('page.signFooterBar.blockDappFromSendingRequests')}
          </CancelItem>
        )}
      </div>
    </div>
  );
};
