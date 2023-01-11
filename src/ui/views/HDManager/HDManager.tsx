import './index.less';
import { useWallet } from '@/ui/utils';
import React from 'react';
import { HDManagerStateProvider, StateProviderProps } from './utils';
import { Spin } from 'antd';
import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { LedgerManager } from './LedgerManager';
import { OneKeyManager } from './OnekeyManager';
import { TrezorManager } from './TrezorManager';
import { ReactComponent as TrezorSVG } from 'ui/assets/walletlogo/trezor.svg';
import { ReactComponent as OneKeySVG } from 'ui/assets/walletlogo/onekey.svg';
import { ReactComponent as LedgerSVG } from 'ui/assets/walletlogo/ledger.svg';

const LOGO_MAP = {
  [HARDWARE_KEYRING_TYPES.Ledger.type]: LedgerSVG,
  [HARDWARE_KEYRING_TYPES.Trezor.type]: TrezorSVG,
  [HARDWARE_KEYRING_TYPES.Onekey.type]: OneKeySVG,
};

const LOGO_NAME_MAP = {
  [HARDWARE_KEYRING_TYPES.Ledger.type]: 'Ledger',
  [HARDWARE_KEYRING_TYPES.Trezor.type]: 'Trezor',
  [HARDWARE_KEYRING_TYPES.Onekey.type]: 'OneKey',
};

const MANAGER_MAP = {
  [HARDWARE_KEYRING_TYPES.Ledger.type]: LedgerManager,
  [HARDWARE_KEYRING_TYPES.Trezor.type]: TrezorManager,
  [HARDWARE_KEYRING_TYPES.Onekey.type]: OneKeyManager,
};

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

  const Logo = LOGO_MAP[keyring];
  const Manager = MANAGER_MAP[keyring];
  const name = LOGO_NAME_MAP[keyring];

  return (
    <HDManagerStateProvider keyringId={idRef.current} keyring={keyring}>
      <div className="HDManager">
        <main>
          <div className="logo">
            <Logo className="icon" />
            <span className="title">Connected to {name}</span>
          </div>
          <Manager />
        </main>
      </div>
    </HDManagerStateProvider>
  );
};
