import {
  openInternalPageInTab,
  useApproval,
  useCommonPopupView,
} from '@/ui/utils';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useImKeyDeviceConnected } from '@/ui/utils/imKey';

export const ImKeyPermission: React.FC = () => {
  const { setTitle, setHeight, closePopup } = useCommonPopupView();
  const [_, __, rejectApproval] = useApproval();
  const hasConnectedImKey = useImKeyDeviceConnected();
  const { t } = useTranslation();

  React.useEffect(() => {
    setTitle(t('page.dashboard.hd.howToConnectImKey'));
    setHeight(360);
  }, []);

  React.useEffect(() => {
    if (hasConnectedImKey) {
      closePopup();
    }
  }, [hasConnectedImKey]);

  const handleClick = async () => {
    await rejectApproval(t('page.dashboard.hd.userRejectedTheRequest'), true);
    openInternalPageInTab('request-permission?type=imkey&from=approval');
  };

  return (
    <div className="pt-[10px]">
      <ul className="list-decimal w-[180px] pl-[20px] m-auto text-r-neutral-title1 text-14 leading-[20px]">
        <li>{t('page.dashboard.hd.imkey.doc1')}</li>
        <li>{t('page.dashboard.hd.imkey.doc2')}</li>
      </ul>
      <img
        src="/images/imkey-plug.svg"
        className="w-[240px] bg-r-neutral-card2 rounded-[4px] mt-[20px] mx-auto py-20 px-40"
      />
      <div className="mt-[46px] text-13 text-r-neutral-body">
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
