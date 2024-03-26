import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { StrayPageWithButton } from 'ui/component';
import { hasConnectedLedgerDevice } from '@/ui/utils';
import { HARDWARE_KEYRING_TYPES } from 'consts';
import './style.less';
import { query2obj } from '@/ui/utils/url';

const LedgerConnect = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const { search } = useLocation();

  const qs = query2obj(search);
  const isReconnect = !!qs.reconnect;

  const onSubmit = async () => {
    const supportWebHID = await TransportWebHID.isSupported();
    const hasConnectedLedger = await hasConnectedLedgerDevice();

    if (isReconnect) {
      history.push({
        pathname: '/request-permission',
        search: '?type=ledger&reconnect=1',
      });
      return;
    }

    if (!supportWebHID) {
      history.push({
        pathname: '/import/select-address',
        state: {
          keyring: HARDWARE_KEYRING_TYPES.Ledger.type,
          isWebHID: false,
          ledgerLive: true,
        },
        search: `?hd=${HARDWARE_KEYRING_TYPES.Ledger.type}`,
      });
    } else {
      if (hasConnectedLedger) {
        history.push({
          pathname: '/import/select-address',
          state: {
            keyring: HARDWARE_KEYRING_TYPES.Ledger.type,
            isWebHID: true,
            ledgerLive: false,
          },
          search: `?hd=${HARDWARE_KEYRING_TYPES.Ledger.type}`,
        });
      } else {
        history.push({
          pathname: '/request-permission',
          search: '?type=ledger',
        });
      }
    }
  };

  return (
    <StrayPageWithButton
      header={{
        title: t('page.newAddress.ledger.title'),
        center: true,
      }}
      className="stray-page-wide"
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
          <li>{t('page.dashboard.hd.ledger.doc3')}</li>
        </ul>
        <img src="/images/ledger-plug.png" className="ledger-plug" />
      </div>
    </StrayPageWithButton>
  );
};

export default LedgerConnect;
