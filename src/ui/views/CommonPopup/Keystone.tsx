import {
  openInternalPageInTab,
  useApproval,
  useCommonPopupView,
} from '@/ui/utils';
import { useKeystoneDeviceConnected } from '@/utils/keystone';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

export const Keystone: React.FC = () => {
  const { setTitle, setHeight, closePopup } = useCommonPopupView();
  const [_, __, rejectApproval] = useApproval();
  const hasConnected = useKeystoneDeviceConnected();
  const { t } = useTranslation();

  React.useEffect(() => {
    setTitle(t('page.dashboard.hd.howToConnectKeystone'));
    setHeight(360);
  }, []);

  React.useEffect(() => {
    if (hasConnected) {
      closePopup();
    }
  }, [hasConnected]);

  const handleClick = async () => {
    await rejectApproval(t('page.dashboard.hd.userRejectedTheRequest'), true);
    openInternalPageInTab('request-permission?type=keystone&from=approval');
  };

  return (
    <div className="pt-[10px]">
      <ul className="list-decimal w-[250px] pl-[20px] m-auto text-gray-title text-14 leading-[20px]">
        <li>{t('page.dashboard.hd.keystone.doc1')}</li>
        <li>{t('page.dashboard.hd.keystone.doc2')}</li>
        <li>{t('page.dashboard.hd.keystone.doc3')}</li>
      </ul>
      <img
        src="/images/keystone-plug.png"
        className="w-[240px] bg-gray-bg mt-[20px] mx-auto py-20 px-40"
      />
      <div className="mt-[25px] text-13 text-gray-subTitle">
        <Trans t={t} i18nKey="page.dashboard.hd.keystone.reconnect">
          If it doesn't work, please try
          <span className="underline cursor-pointer" onClick={handleClick}>
            reconnecting from the beginning.
          </span>
        </Trans>
      </div>
    </div>
  );
};
