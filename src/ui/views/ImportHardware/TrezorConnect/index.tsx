import React from 'react';
import { useTranslation } from 'react-i18next';
import { StrayPageWithButton } from 'ui/component';
import { openInternalPageInTab } from '@/ui/utils';
import './style.less';
import { TrezorBanner } from './Bannder';

const TrezorConnect = () => {
  const { t } = useTranslation();

  const onSubmit = async () => {
    openInternalPageInTab('import/hardware?connectType=TREZOR');
  };

  return (
    <StrayPageWithButton
      header={{
        title: t('page.newAddress.trezor.title'),
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
        <ul className="list-decimal w-[180px] pl-[20px] m-auto text-r-neutral-title1 text-14 leading-[20px] mb-[50px]">
          <li>{t('page.dashboard.hd.ledger.doc1')}</li>
          <li>{t('page.dashboard.hd.ledger.doc2')}</li>
          <li className="opacity-0"></li>
        </ul>
        <img src="/images/trezor-plug.png" className="ledger-plug" />
      </div>
      <TrezorBanner className="ledger-banner" />
    </StrayPageWithButton>
  );
};

export default TrezorConnect;
