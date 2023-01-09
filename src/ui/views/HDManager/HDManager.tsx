import './index.less';
import { useWallet } from '@/ui/utils';
import React from 'react';
import { HDManagerStateProvider, StateProviderProps } from './utils';
import { Spin } from 'antd';
import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { LedgerManager } from './LedgerManager';
import { OneKeyManager } from './OnekeyManager';
import { TrezorManager } from './TrezorManager';

export const HDManager: React.FC<StateProviderProps> = ({ keyring }) => {
  const wallet = useWallet();
  const [initialed, setInitialed] = React.useState(false);
  const idRef = React.useRef<number | null>(null);

  const closeConnect = React.useCallback(() => {
    wallet.requestKeyring(keyring, 'cleanUp', idRef.current);
  }, []);

  React.useEffect(() => {
    wallet
      .connectHardware({
        type: keyring,
        isWebHID: true,
      })
      .then((id) => {
        idRef.current = id;
        setInitialed(true);
      });

    window.addEventListener('beforeunload', () => {
      closeConnect();
    });

    return () => {
      closeConnect();
    };
  }, []);

  if (!initialed) {
    return (
      <div className="flex items-center justify-center w-screen h-screen">
        <Spin />
      </div>
    );
  }

  return (
    <HDManagerStateProvider keyringId={idRef.current} keyring={keyring}>
      <div className="HDManager">
        <main>
          {keyring === HARDWARE_KEYRING_TYPES.Ledger.type && <LedgerManager />}
          {keyring === HARDWARE_KEYRING_TYPES.Onekey.type && <OneKeyManager />}
          {keyring === HARDWARE_KEYRING_TYPES.Trezor.type && <TrezorManager />}
        </main>
      </div>
    </HDManagerStateProvider>
  );
};
