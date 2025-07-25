import {
  openInternalPageInTab,
  useApproval,
  useCommonPopupView,
} from '@/ui/utils';
import { useLedgerDeviceConnected } from '@/ui/utils/ledger';
import { message } from 'antd';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

export const OneKey: React.FC<{
  isModalContent?: boolean;
}> = ({ isModalContent }) => {
  const { setTitle, setHeight, closePopup } = useCommonPopupView();
  const [_, __, rejectApproval] = useApproval();
  const hasConnectedLedgerHID = useLedgerDeviceConnected();
  const { t } = useTranslation();

  React.useEffect(() => {
    if (!isModalContent) {
      setTitle(t('page.dashboard.hd.onekeyIsDisconnected'));
      setHeight(320);
    }
  }, [!isModalContent]);

  React.useEffect(() => {
    if (!isModalContent && hasConnectedLedgerHID) {
      message.success(t('page.dashboard.hd.ledger.connected'));
      closePopup();
    }
  }, [hasConnectedLedgerHID, !isModalContent]);

  const handleClick = async () => {
    if (!isModalContent) {
      await rejectApproval(t('page.dashboard.hd.userRejectedTheRequest'), true);
      openInternalPageInTab('request-permission?type=ledger&from=approval');
    } else {
      openInternalPageInTab(
        'request-permission?type=ledger&reconnect=1',
        true,
        false
      );
    }
  };

  return (
    <div className="pt-[4px]">
      <div className="pl-[20px] m-auto text-r-neutral-title1 text-14 leading-[20px]">
        <p>
          <Trans i18nKey="page.newUserImport.importOneKey.tip1" t={t}>
            1. Install
            <a
              className="ml-2 underline text-r-blue-default"
              href="https://onekey.so/download/?client=bridge"
              target="_blank"
              rel="noreferrer"
            >
              OneKey Bridge
            </a>
          </Trans>
        </p>
        <p>{t('page.newUserImport.importOneKey.tip2')}</p>
        <p>{t('page.newUserImport.importOneKey.tip3')}</p>
      </div>
      {/* <img
        src="/images/ledger-plug.png"
        className="w-[240px] bg-r-neutral-card1 rounded-[4px] mt-[20px] mx-auto py-20 px-40"
      /> */}
      {/* <div className="mt-[24px] text-13 text-r-neutral-body text-center">
        <Trans t={t} i18nKey="page.dashboard.hd.ledger.reconnect">
          If it doesn't work, try
          <span className="underline cursor-pointer" onClick={handleClick}>
            reconnecting from the beginning.
          </span>
        </Trans>
      </div> */}
    </div>
  );
};
