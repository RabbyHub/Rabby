import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { StrayPageWithButton } from 'ui/component';
import { openInternalPageInTab } from '@/ui/utils';
import './style.less';
import { OneKeyBanner } from './Bannder';

const OneKeyConnect = () => {
  const { t } = useTranslation();

  const onSubmit = async () => {
    openInternalPageInTab('import/hardware?connectType=ONEKEY');
  };

  return (
    <StrayPageWithButton
      header={{
        title: t('page.newAddress.onekey.title'),
        center: true,
      }}
      className="stray-page-wide ledger-page"
      backgroundClassName="bg-r-neutral-card2"
      headerClassName="mb-40 text-r-neutral-title1"
      onSubmit={onSubmit}
      hasBack={false}
      footerFixed={false}
    >
      <div className="connect-ledger">
        <ul className="list-decimal w-[fit-content] pl-[20px] m-auto text-r-neutral-title1 text-14 leading-[20px] mb-[50px]">
          <li>
            <Trans i18nKey="page.dashboard.hd.onekey.doc1" t={t}>
              Install
              <a
                className="ml-2 underline text-r-blue-default"
                href="https://onekey.so/download/?client=bridge"
                target="_blank"
                rel="noreferrer"
              >
                OneKey Bridge
              </a>
            </Trans>
          </li>
          <li>{t('page.dashboard.hd.onekey.doc2')}</li>
          <li>{t('page.dashboard.hd.onekey.doc3')}</li>
        </ul>
        <img src="/images/onekey-plug.png" className="ledger-plug" />
      </div>
      <OneKeyBanner className="ledger-banner" />
    </StrayPageWithButton>
  );
};

export default OneKeyConnect;
