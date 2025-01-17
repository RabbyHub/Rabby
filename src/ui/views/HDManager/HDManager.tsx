import './index.less';
import { useWallet } from '@/ui/utils';
import React from 'react';
import {
  HDManagerStateContext,
  HDManagerStateProvider,
  StateProviderProps,
} from './utils';
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
import NgraveSVG from '@/ui/assets/walletlogo/ngrave.svg';
import { ReactComponent as AirGapSVG } from '@/ui/assets/walletlogo/airgap.svg';
import { ReactComponent as CoolWalletSVG } from '@/ui/assets/walletlogo/coolwallet.svg';
import { ReactComponent as BitBox02SVG } from '@/ui/assets/walletlogo/bitbox02.svg';
import { ReactComponent as imtokenOfflineSVG } from '@/ui/assets/walletlogo/imTokenOffline.svg';
import { BitBox02Manager } from './BitBox02Manager';
import { useTranslation } from 'react-i18next';
import { ImKeyManager } from './ImKeyManager';
import { useHistory, useLocation } from 'react-router-dom';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useRabbyDispatch } from '@/ui/store';
import { account } from '@/ui/models/account';
import { useNewUserGuideStore } from '../NewUserImport/hooks/useNewUserGuideStore';

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
  [WALLET_BRAND_TYPES.NGRAVEZERO]: NgraveSVG,
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
  const { search } = useLocation();
  const [isNewUserImport, noRedirect, isLazyImport] = React.useMemo(() => {
    const query = new URLSearchParams(search);
    return [
      query.get('isNewUserImport'),
      query.get('noRedirect'),
      !!query.get('isLazyImport'),
    ];
  }, [search]);
  const history = useHistory();

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
    [WALLET_BRAND_TYPES.NGRAVEZERO]: t('page.newAddress.hd.manageNgraveZero'),
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
    if (!isNewUserImport) {
      window.addEventListener('beforeunload', () => {
        closeConnect();
      });
    }

    return () => {
      if (!isNewUserImport) {
        closeConnect();
      }
    };
  }, []);

  const handleCloseWin = useMemoizedFn(async () => {
    if (isNewUserImport && !noRedirect) {
      history.push(
        `/new-user/success?hd=${keyring}&keyringId=${keyringId}&brand=${brand}`
      );
      return;
    }
    window.close();
  });

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
    <HDManagerStateProvider
      keyringId={idRef.current}
      keyring={keyring}
      isLazyImport={isLazyImport}
    >
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
        <DoneButton onClick={handleCloseWin} />
      </div>
    </HDManagerStateProvider>
  );
};

const DoneButton = ({ onClick }: { onClick?(): void }) => {
  const { t } = useTranslation();

  const {
    currentAccounts,
    selectedAccounts,
    getCurrentAccounts,
    isLazyImport,
    createTask,
    keyring,
    keyringId,
  } = React.useContext(HDManagerStateContext);

  const dispatch = useRabbyDispatch();

  const { store } = useNewUserGuideStore();

  const wallet = useWallet();
  const history = useHistory();

  const { loading, runAsync: handleLazyAdd } = useRequest(
    async () => {
      if (!(await wallet.isBooted())) {
        if (store.password) {
          await wallet.boot(store.password);
        } else {
          history.push('/new-user/guide');
        }
      }
      await createTask(async () => {
        if (keyring === KEYRING_CLASS.MNEMONIC) {
          await dispatch.importMnemonics.setField({
            confirmingAccounts: selectedAccounts.map((account) => {
              return {
                address: account.address,
                index: account.index,
                alianName: account.aliasName || '',
              };
            }),
          });
          await dispatch.importMnemonics.confirmAllImportingAccountsAsync();
        } else {
          await wallet.unlockHardwareAccount(
            keyring,
            selectedAccounts.map((account) => account.index - 1),
            keyringId
          );
        }
      });

      await createTask(() =>
        wallet.requestKeyring(keyring, 'setCurrentUsedHDPathType', keyringId)
      );

      await createTask(() => getCurrentAccounts());
      onClick?.();
    },
    {
      manual: true,
    }
  );

  return (
    <div className="absolute bottom-[40px] left-0 right-0 text-center">
      {isLazyImport ? (
        <Button
          type="primary"
          className="w-[280px] h-[60px] text-20"
          onClick={handleLazyAdd}
          loading={loading}
          disabled={!selectedAccounts.length}
        >
          {t('page.newAddress.hd.importBtn', {
            count: selectedAccounts.length,
          })}
        </Button>
      ) : (
        <Button
          type="primary"
          className="w-[280px] h-[60px] text-20"
          onClick={onClick}
          disabled={!currentAccounts.length}
        >
          {t('page.newAddress.hd.done')}
        </Button>
      )}
    </div>
  );
};
