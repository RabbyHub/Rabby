import './index.less';
import { useWallet } from '@/ui/utils';
import React from 'react';
import { HDManagerStateProvider, StateProviderProps } from './utils';
import { Spin } from 'antd';
import { HARDWARE_KEYRING_TYPES, KEYRING_CLASS } from '@/constant';
import { LedgerManager } from './LedgerManager';
import { OneKeyManager } from './OnekeyManager';
import { TrezorManager } from './TrezorManager';
import { MnemonicManager } from './MnemonicManager';
import { ReactComponent as TrezorSVG } from 'ui/assets/walletlogo/trezor.svg';
import { ReactComponent as OneKeySVG } from 'ui/assets/walletlogo/onekey.svg';
import { ReactComponent as LedgerSVG } from 'ui/assets/walletlogo/ledger.svg';
import { ReactComponent as MnemonicSVG } from '@/ui/assets/walletlogo/mnemonic-ink.svg';

const LOGO_MAP = {
  [HARDWARE_KEYRING_TYPES.Ledger.type]: LedgerSVG,
  [HARDWARE_KEYRING_TYPES.Trezor.type]: TrezorSVG,
  [HARDWARE_KEYRING_TYPES.Onekey.type]: OneKeySVG,
  [KEYRING_CLASS.MNEMONIC]: MnemonicSVG,
};

const LOGO_NAME_MAP = {
  [HARDWARE_KEYRING_TYPES.Ledger.type]: 'Connected to Ledger',
  [HARDWARE_KEYRING_TYPES.Trezor.type]: 'Connected to Trezor',
  [HARDWARE_KEYRING_TYPES.Onekey.type]: 'Connected to OneKey',
  [KEYRING_CLASS.MNEMONIC]: 'Manage Seed Phrase ',
};

const MANAGER_MAP = {
  [HARDWARE_KEYRING_TYPES.Ledger.type]: LedgerManager,
  [HARDWARE_KEYRING_TYPES.Trezor.type]: TrezorManager,
  [HARDWARE_KEYRING_TYPES.Onekey.type]: OneKeyManager,
  [KEYRING_CLASS.MNEMONIC]: MnemonicManager,
};

export const HDManager: React.FC<StateProviderProps> = ({
  keyring,
  keyringId,
}) => {
  const wallet = useWallet();
  const [initialed, setInitialed] = React.useState(false);
  const idRef = React.useRef<number | null>(null);

  const closeConnect = React.useCallback(() => {
    wallet.requestKeyring(keyring, 'cleanUp', idRef.current);
  }, []);

  React.useEffect(() => {
    if (keyring === KEYRING_CLASS.MNEMONIC) {
      idRef.current = keyringId;
      setInitialed(true);
    } else {
      wallet
        .connectHardware({
          type: keyring,
          isWebHID: true,
        })
        .then((id) => {
          idRef.current = id;
          setInitialed(true);
        });
    }

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
            <span className="title">{name}</span>
          </div>
          <Manager />
        </main>
      </div>
    </HDManagerStateProvider>
  );
};
