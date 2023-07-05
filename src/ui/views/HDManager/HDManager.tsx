import './index.less';
import { useWallet } from '@/ui/utils';
import React from 'react';
import { HDManagerStateProvider, StateProviderProps } from './utils';
import { Spin, message } from 'antd';
import {
  HARDWARE_KEYRING_TYPES,
  KEYRING_CLASS,
  WALLET_BRAND_TYPES,
} from '@/constant';
import { LedgerManager } from './LedgerManager';
import { OneKeyManager } from './OnekeyManager';
import { TrezorManager } from './TrezorManager';
import { MnemonicManager } from './MnemonicManager';
import { GridPlusManager } from './GridPlusManager';
import { QRCodeManager } from './QRCodeManager';
import { ReactComponent as TrezorSVG } from 'ui/assets/walletlogo/trezor.svg';
import { ReactComponent as OneKeySVG } from 'ui/assets/walletlogo/onekey.svg';
import { ReactComponent as LedgerSVG } from 'ui/assets/walletlogo/ledger.svg';
import { ReactComponent as MnemonicSVG } from '@/ui/assets/walletlogo/mnemonic-ink.svg';
import { ReactComponent as GridPlusSVG } from '@/ui/assets/walletlogo/gridplus.svg';
import { ReactComponent as KeyStoneSVG } from '@/ui/assets/walletlogo/keystone.svg';
import { ReactComponent as AirGapSVG } from '@/ui/assets/walletlogo/airgap.svg';
import { ReactComponent as CoolWalletSVG } from '@/ui/assets/walletlogo/coolwallet.svg';

const LOGO_MAP = {
  [HARDWARE_KEYRING_TYPES.Ledger.type]: LedgerSVG,
  [HARDWARE_KEYRING_TYPES.Trezor.type]: TrezorSVG,
  [HARDWARE_KEYRING_TYPES.Onekey.type]: OneKeySVG,
  [KEYRING_CLASS.MNEMONIC]: MnemonicSVG,
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: GridPlusSVG,
  [WALLET_BRAND_TYPES.KEYSTONE]: KeyStoneSVG,
  [WALLET_BRAND_TYPES.AIRGAP]: AirGapSVG,
  [WALLET_BRAND_TYPES.COOLWALLET]: CoolWalletSVG,
};

const LOGO_NAME_MAP = {
  [HARDWARE_KEYRING_TYPES.Ledger.type]: 'Connected to Ledger',
  [HARDWARE_KEYRING_TYPES.Trezor.type]: 'Connected to Trezor',
  [HARDWARE_KEYRING_TYPES.Onekey.type]: 'Connected to OneKey',
  [KEYRING_CLASS.MNEMONIC]: 'Manage Seed Phrase ',
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: 'Manage GridPlus',
  [WALLET_BRAND_TYPES.KEYSTONE]: 'Manage KeyStone',
  [WALLET_BRAND_TYPES.AIRGAP]: 'Manage AirGap',
  [WALLET_BRAND_TYPES.COOLWALLET]: 'Manage CoolWallet',
};

const MANAGER_MAP = {
  [HARDWARE_KEYRING_TYPES.Ledger.type]: LedgerManager,
  [HARDWARE_KEYRING_TYPES.Trezor.type]: TrezorManager,
  [HARDWARE_KEYRING_TYPES.Onekey.type]: OneKeyManager,
  [KEYRING_CLASS.MNEMONIC]: MnemonicManager,
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: GridPlusManager,
  [KEYRING_CLASS.HARDWARE.KEYSTONE]: QRCodeManager,
};

export const HDManager: React.FC<StateProviderProps> = ({
  keyring,
  keyringId,
  brand,
}) => {
  const wallet = useWallet();
  const [initialed, setInitialed] = React.useState(false);
  const idRef = React.useRef<number | null>(null);

  const closeConnect = React.useCallback(() => {
    wallet.requestKeyring(keyring, 'cleanUp', idRef.current);
  }, []);

  React.useEffect(() => {
    if (
      keyring === KEYRING_CLASS.MNEMONIC ||
      keyring === KEYRING_CLASS.HARDWARE.KEYSTONE
    ) {
      idRef.current = keyringId;
      setInitialed(true);
    } else {
      wallet
        .connectHardware({
          type: keyring,
          isWebHID: true,
          needUnlock: keyring === KEYRING_CLASS.HARDWARE.GRIDPLUS,
        })
        .then((id) => {
          idRef.current = id;
          setInitialed(true);
        })
        .catch((e) => {
          console.error(e);
          setInitialed(false);
          message.error({
            content:
              'Connect has stopped. Please refresh the page to connect again.',
            key: 'ledger-error',
          });
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

  const Logo = LOGO_MAP[brand ?? keyring];
  const name = LOGO_NAME_MAP[brand ?? keyring];
  const Manager = MANAGER_MAP[keyring];

  return (
    <HDManagerStateProvider keyringId={idRef.current} keyring={keyring}>
      <div className="HDManager">
        <main>
          <div className="logo">
            <Logo className="icon" />
            <span className="title">{name}</span>
          </div>
          <Manager brand={brand} />
        </main>
      </div>
    </HDManagerStateProvider>
  );
};
