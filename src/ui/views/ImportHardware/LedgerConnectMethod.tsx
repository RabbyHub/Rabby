import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { StrayPageWithButton } from 'ui/component';
import { hasConnectedLedgerDevice } from '@/utils';
import { IS_CHROME } from 'consts';

const LedgerConnectMethod = () => {
  const history = useHistory();
  const [spinning, setSpinning] = useState(true);
  const [supportWebHID, setSupportWebHID] = useState(IS_CHROME);
  const [hasConnectedLedger, setHasConnectedLedger] = useState(false);
  const { t } = useTranslation();

  const onSubmit = async () => {
    if (!supportWebHID) {
      // TODO use Ledger Live Bridge
    } else {
      if (hasConnectedLedger) {
        // TODO redirect to select address
      } else {
        // TODO redirect to permission request
      }
    }
  };

  const init = async () => {
    setSupportWebHID(await TransportWebHID.isSupported());
    setHasConnectedLedger(await hasConnectedLedgerDevice());
    setSpinning(false);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <StrayPageWithButton
      header={{
        title: t('Connect Ledger'),
        center: true,
      }}
      headerClassName="mb-40"
      onSubmit={onSubmit}
      hasBack
      spinning={spinning}
      footerFixed={false}
    >
      <div className="w-[300px]">
        <ul>
          <li>Plug in a single Ledger</li>
          <li>Enter pin to unlock</li>
          <li>Open Ethereum App</li>
        </ul>
        <img src="/images/ledger-plug.png" className="ledger-plug" />
      </div>
    </StrayPageWithButton>
  );
};

export default LedgerConnectMethod;
