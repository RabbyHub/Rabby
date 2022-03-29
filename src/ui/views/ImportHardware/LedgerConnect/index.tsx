import React from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { StrayPageWithButton } from 'ui/component';
import { hasConnectedLedgerDevice } from '@/utils';
import { HARDWARE_KEYRING_TYPES } from 'consts';
import './style.less';

const LedgerConnect = () => {
  const history = useHistory();
  const { t } = useTranslation();

  const onSubmit = async () => {
    const supportWebHID = await TransportWebHID.isSupported();
    const hasConnectedLedger = await hasConnectedLedgerDevice();
    if (!supportWebHID) {
      history.push({
        pathname: '/import/select-address',
        state: {
          keyring: HARDWARE_KEYRING_TYPES.Ledger.type,
          isWebHID: false,
          ledgerLive: true,
        },
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
        title: t('Connect Ledger'),
        center: true,
      }}
      headerClassName="mb-40"
      onSubmit={onSubmit}
      hasBack={false}
      footerFixed={false}
    >
      <div className="connect-ledger">
        <ul>
          <li>1. Plug your Ledger wallet into your computer</li>
          <li>2. Unlock Ledger and open the Ethereum app</li>
        </ul>
        <img src="/images/ledger-plug.png" className="ledger-plug" />
      </div>
    </StrayPageWithButton>
  );
};

export default LedgerConnect;
