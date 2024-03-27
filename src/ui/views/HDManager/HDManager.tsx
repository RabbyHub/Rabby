import './index.less';
import { useWallet } from '@/ui/utils';
import React from 'react';
import { HDManagerStateProvider, StateProviderProps } from './utils';
import { Button, Spin, message } from 'antd';
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
import { ReactComponent as ImKeySVG } from 'ui/assets/walletlogo/imkey.svg';
import { ReactComponent as RcMnemonicSVG } from '@/ui/assets/walletlogo/mnemonic-ink-cc.svg';
import { ReactComponent as GridPlusSVG } from '@/ui/assets/walletlogo/gridplus.svg';
import KeyStoneSVG from '@/ui/assets/walletlogo/keystone.svg';
import { ReactComponent as AirGapSVG } from '@/ui/assets/walletlogo/airgap.svg';
import { ReactComponent as CoolWalletSVG } from '@/ui/assets/walletlogo/coolwallet.svg';
import { ReactComponent as BitBox02SVG } from '@/ui/assets/walletlogo/bitbox02.svg';
import { ReactComponent as imtokenOfflineSVG } from '@/ui/assets/walletlogo/imTokenOffline.svg';
import { BitBox02Manager } from './BitBox02Manager';
import { useTranslation } from 'react-i18next';
import { ImKeyManager } from './ImKeyManager';

const LOGO_MAP = {
  [HARDWARE_KEYRING_TYPES.Ledger.type]: LedgerSVG,
  [HARDWARE_KEYRING_TYPES.Trezor.type]: TrezorSVG,
  [HARDWARE_KEYRING_TYPES.Onekey.type]: OneKeySVG,
  [KEYRING_CLASS.MNEMONIC]: RcMnemonicSVG,
  [HARDWARE_KEYRING_TYPES.GridPlus.type]: GridPlusSVG,
  [WALLET_BRAND_TYPES.KEYSTONE]: KeyStoneSVG,
  [WALLET_BRAND_TYPES.AIRGAP]: AirGapSVG,
  [WALLET_BRAND_TYPES.COOLWALLET]: CoolWalletSVG,
  [HARDWARE_KEYRING_TYPES.BitBox02.type]: BitBox02SVG,
  [WALLET_BRAND_TYPES.IMTOKENOFFLINE]: imtokenOfflineSVG,
  [HARDWARE_KEYRING_TYPES.ImKey.type]: ImKeySVG,
};

const MANAGER_MAP = {
  [HARDWARE_KEYRING_TYPES.Ledger.type]: LedgerManager,
  [HARDWARE_KEYRING_TYPES.Trezor.type]: TrezorManager,
  [HARDWARE_KEYRING_TYPES.Onekey.type]: OneKeyManager,
  [KEYRING_CLASS.MNEMONIC]: MnemonicManager,
  [HARDWARE_KEYRING_TYPES.GridPlus.type]: GridPlusManager,
  [HARDWARE_KEYRING_TYPES.Keystone.type]: QRCodeManager,
  [HARDWARE_KEYRING_TYPES.BitBox02.type]: BitBox02Manager,
  [HARDWARE_KEYRING_TYPES.ImKey.type]: ImKeyManager,
};

export const HDManager: React.FC<StateProviderProps> = ({
  keyring,
  keyringId,
  brand,
}) => {
  const wallet = useWallet();
  const [initialed, setInitialed] = React.useState(false);
  const idRef = React.useRef<number | null>(null);
  const { t } = useTranslation();
  const closeConnect = React.useCallback(() => {
    wallet.requestKeyring(keyring, 'cleanUp', idRef.current, true);
  }, []);

  const LOGO_NAME_MAP = {
    [HARDWARE_KEYRING_TYPES.Ledger.type]: t(
      'page.newAddress.hd.connectedToLedger'
    ),
    [HARDWARE_KEYRING_TYPES.Trezor.type]: t(
      'page.newAddress.hd.connectedToTrezor'
    ),
    [HARDWARE_KEYRING_TYPES.Onekey.type]: t(
      'page.newAddress.hd.connectedToOnekey'
    ),
    [KEYRING_CLASS.MNEMONIC]: t('page.newAddress.hd.manageSeedPhrase'),
    [HARDWARE_KEYRING_TYPES.GridPlus.type]: t(
      'page.newAddress.hd.manageGridplus'
    ),
    [WALLET_BRAND_TYPES.KEYSTONE]: t('page.newAddress.hd.manageKeystone'),
    [WALLET_BRAND_TYPES.IMTOKENOFFLINE]: t(
      'page.newAddress.hd.manageImtokenOffline'
    ),
    [WALLET_BRAND_TYPES.COOLWALLET]: t('page.newAddress.hd.manageCoolwallet'),
    [HARDWARE_KEYRING_TYPES.BitBox02.type]: t(
      'page.newAddress.hd.manageBitbox02'
    ),
    [HARDWARE_KEYRING_TYPES.ImKey.type]: t('page.newAddress.hd.manageImKey'),
  };

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
            content: t('page.newAddress.hd.tooltip.connectError'),
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

  const handleCloseWin = React.useCallback(() => {
    window.close();
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
      <div className="HDManager relative">
        <main>
          <div className="logo">
            {typeof Logo === 'string' ? (
              <img src={Logo} className="icon" />
            ) : (
              <Logo className="icon text-r-neutral-body" />
            )}
            <span className="title">{name}</span>
          </div>
          <Manager brand={brand} />
        </main>
        <div
          onClick={handleCloseWin}
          className="absolute bottom-[40px] left-0 right-0 text-center"
        >
          <Button type="primary" className="w-[280px] h-[60px] text-20">
            {t('page.newAddress.hd.done')}
          </Button>
        </div>
      </div>
    </HDManagerStateProvider>
  );
};
