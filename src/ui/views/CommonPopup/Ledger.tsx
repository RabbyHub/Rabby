import {
  openInternalPageInTab,
  useApproval,
  useCommonPopupView,
} from '@/ui/utils';
import { useLedgerDeviceConnected } from '@/ui/utils/ledger';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

export const Ledger: React.FC = () => {
  const { setTitle, setHeight, closePopup } = useCommonPopupView();
  const [_, __, rejectApproval] = useApproval();
  const hasConnectedLedgerHID = useLedgerDeviceConnected();
  const { t } = useTranslation();

  React.useEffect(() => {
    setTitle(t('page.dashboard.hd.howToConnectLedger'));
    setHeight(320);
  }, []);

  React.useEffect(() => {
    if (hasConnectedLedgerHID) {
      closePopup();
    }
  }, [hasConnectedLedgerHID]);

  const handleClick = async () => {
    await rejectApproval(t('page.dashboard.hd.userRejectedTheRequest'), true);
    openInternalPageInTab('request-permission?type=ledger&from=approval');
  };

  return (
    <div className="pt-[4px]">
      <ul className="list-decimal w-[180px] pl-[20px] m-auto text-r-neutral-title1 text-14 leading-[20px]">
        <li>{t('page.dashboard.hd.ledger.doc1')}</li>
        <li>{t('page.dashboard.hd.ledger.doc2')}</li>
        <li>{t('page.dashboard.hd.ledger.doc3')}</li>
      </ul>
      <img
        src="/images/ledger-plug.png"
        className="w-[240px] bg-r-neutral-card1 rounded-[4px] mt-[20px] mx-auto py-20 px-40"
      />
      <div className="mt-[24px] text-13 text-r-neutral-body">
        <Trans t={t} i18nKey="page.dashboard.hd.ledger.reconnect">
          If it doesn't work, please try
          <span className="underline cursor-pointer" onClick={handleClick}>
            reconnecting from the beginning.
          </span>
        </Trans>
      </div>
    </div>
  );
};
