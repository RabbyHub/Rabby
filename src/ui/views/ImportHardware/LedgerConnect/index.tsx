import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { StrayPageWithButton } from 'ui/component';
import { hasConnectedLedgerDevice } from '@/utils';
import { IS_CHROME, HARDWARE_KEYRING_TYPES } from 'consts';
import './style.less';

const LedgerConnect = () => {
  const history = useHistory();
  const [spinning, setSpinning] = useState(true);
  const [supportWebHID, setSupportWebHID] = useState(IS_CHROME);
  const [hasConnectedLedger, setHasConnectedLedger] = useState(false);
  const { t } = useTranslation();

  const onSubmit = async () => {
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

  const init = async () => {
    const support = await TransportWebHID.isSupported();
    const hasDevice = await hasConnectedLedgerDevice();
    setSupportWebHID(support);
    setHasConnectedLedger(hasDevice);
    setSpinning(false);
  };

  useEffect(() => {
    init();
    return () => {
      console.log('unmount');
    };
  }, []);

  return (
    <StrayPageWithButton
      header={{
        title: t('Connect Ledger'),
        center: true,
      }}
      headerClassName="mb-40"
      onSubmit={onSubmit}
      hasBack={false}
      spinning={spinning}
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
