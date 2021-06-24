import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { StrayPageWithButton, FieldCheckbox } from 'ui/component';
import { useWallet } from 'ui/utils';
import { IS_AFTER_CHROME91, IS_CHROME } from 'consts';

const LEDGER_LIVE = 'LEDGER_LIVE';
const DIRECTLY = 'DIRECTLY';

const ConnectMethods = [
  { name: 'Connect through Ledger Live app', value: LEDGER_LIVE },
  { name: 'Connect hardware wallet directly', value: DIRECTLY },
];

const LedgerConnectMethod = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [currentMethod, setCurrentMethod] = useState<null | string>(null);
  const [spinning, setSpin] = useState(false);
  const [supportWebUSB, setSupportWebUSB] = useState(IS_CHROME);

  const onSubmit = async () => {
    if (!currentMethod) {
      return;
    }
    setSpin(true);
    try {
      const useLedgerLive = wallet.isUseLedgerLive();
      if (currentMethod === LEDGER_LIVE && !useLedgerLive) {
        await wallet.updateUseLedgerLive(true);
      } else if (currentMethod === DIRECTLY && useLedgerLive) {
        await wallet.updateUseLedgerLive(false);
      }
      history.push('/import/hardware/ledger');
    } catch (err) {
      console.log('connect error', err);
      setSpin(false);
    }
  };

  const checkWebUSBSupport = async () => {
    const support = await TransportWebUSB.isSupported();
    setSupportWebUSB(support);
  };

  useEffect(() => {
    checkWebUSBSupport();
  }, []);

  const handleMethodChange = (method, checked) => {
    setCurrentMethod(checked && method);
  };

  return (
    <StrayPageWithButton
      header={{
        title: 'Select Connect Method',
        center: true,
      }}
      onSubmit={onSubmit}
      hasBack
      spinning={spinning}
      footerFixed={false}
    >
      <div className="mt-40 mb-[188px]">
        {ConnectMethods.map((path) => (
          <FieldCheckbox
            key={path.name}
            checked={currentMethod === path.value}
            onChange={(checked) => handleMethodChange(path.value, checked)}
            disable={
              path.value === DIRECTLY && IS_AFTER_CHROME91 && !supportWebUSB
            }
          >
            <div>
              <p className="my-0">{path.name}</p>
              {path.value === DIRECTLY && IS_AFTER_CHROME91 && (
                <p className="mt-4 mb-0 text-red-light text-12">
                  Ledger Blue is not supported by Chrome 91 and above versions
                </p>
              )}
            </div>
          </FieldCheckbox>
        ))}
      </div>
    </StrayPageWithButton>
  );
};

export default LedgerConnectMethod;
