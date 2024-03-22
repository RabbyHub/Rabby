import { Modal } from 'antd';
import React from 'react';
import {
  AdvancedSettings,
  DEFAULT_SETTING_DATA,
  SettingData,
} from './AdvancedSettings';
import { HDPathType } from './HDPathTypeButton';
import { MainContainer } from './MainContainer';
import { HDManagerStateContext } from './utils';
import { ReactComponent as RcSettingSVG } from 'ui/assets/setting-outline-cc.svg';
import { ReactComponent as RcHardwareSVG } from 'ui/assets/import/hardware-cc.svg';
import { useAsyncRetry } from 'react-use';
import { useWallet } from '@/ui/utils';
import { HARDWARE_KEYRING_TYPES, WALLET_BRAND_TYPES } from '@/constant';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Modal as CustomModal } from '@/ui/component';
import { useKeystoneUSBErrorCatcher } from '@/ui/utils/keystone';

interface Props {
  brand?: string;
}

const KEYSTONE_TYPE = HARDWARE_KEYRING_TYPES.Keystone.type;

export const QRCodeManager: React.FC<Props> = ({ brand }) => {
  const [loading, setLoading] = React.useState(true);
  const { getCurrentAccounts, currentAccounts, keyringId } = React.useContext(
    HDManagerStateContext
  );
  const isKeystone = brand === 'Keystone';
  const [visibleAdvanced, setVisibleAdvanced] = React.useState(false);
  const [setting, setSetting] = React.useState<SettingData>(
    DEFAULT_SETTING_DATA
  );
  const [firstFetchAccounts, setFirstFetchAccounts] = React.useState(false);
  const wallet = useWallet();
  const history = useHistory();
  const currentAccountsRef = React.useRef(currentAccounts);
  const keystoneErrorCatcher = useKeystoneUSBErrorCatcher();

  const openAdvanced = React.useCallback(() => {
    if (loading) {
      return;
    }
    setVisibleAdvanced(true);
  }, [loading]);

  const fetchInitCurrentPathType = React.useCallback(
    async (nextSetting: SettingData = setting) => {
      let currentType = HDPathType.BIP44;
      try {
        currentType = await wallet.requestKeyring(
          KEYSTONE_TYPE,
          'getCurrentUsedHDPathType',
          keyringId
        );
      } catch (err) {
        currentType = HDPathType.BIP44;
      }

      setSetting({
        ...nextSetting,
        type: currentType,
      });
    },
    []
  );

  const fetchCurrentAccounts = React.useCallback(
    async (nextSetting?: SettingData) => {
      setLoading(true);
      await getCurrentAccounts();
      await fetchInitCurrentPathType(nextSetting);
      setLoading(false);
    },
    []
  );
  const fetchCurrentAccountsRetry = useAsyncRetry(fetchCurrentAccounts);

  const removeAddressAndForgetDevice = React.useCallback(
    async (removeEmptyKeyrings?: boolean) => {
      await Promise.all(
        currentAccountsRef.current?.map(async (account) =>
          wallet.removeAddress(
            account.address,
            KEYSTONE_TYPE,
            undefined,
            removeEmptyKeyrings
          )
        )
      );
      await wallet.requestKeyring(KEYSTONE_TYPE, 'forgetDevice', keyringId);
    },
    [currentAccountsRef, wallet, keyringId]
  );

  const onConfirmAdvanced = React.useCallback(async (data: SettingData) => {
    setVisibleAdvanced(false);

    const { type = HDPathType.BIP44, ...rest } = data;
    if (isKeystone) {
      try {
        setLoading(true);

        if (type !== setting.type) {
          /**
           * This code is written to be consistent with the behavior of importing wallets via QR Code.
           */
          await removeAddressAndForgetDevice(false);
        }

        await wallet.requestKeyring(
          KEYSTONE_TYPE,
          'getAddressesViaUSB',
          keyringId,
          type
        );
        await getCurrentAccounts();
        setLoading(false);
      } catch (error) {
        history.goBack();
        keystoneErrorCatcher(error);
      }
      rest.startNo =
        type === HDPathType.LedgerLive
          ? DEFAULT_SETTING_DATA.startNo
          : rest.startNo;
    }
    await fetchCurrentAccounts({
      type,
      ...rest,
    });
  }, []);

  React.useEffect(() => {
    currentAccountsRef.current = currentAccounts;
  }, [currentAccounts]);

  React.useEffect(() => {
    if (fetchCurrentAccountsRetry.loading) {
      return;
    }
    const errMessage = fetchCurrentAccountsRetry.error?.message ?? '';
    if (!errMessage) {
      setFirstFetchAccounts(true);
      return;
    }
  }, [fetchCurrentAccountsRetry.loading, fetchCurrentAccountsRetry.error]);
  const { t } = useTranslation();

  const openSwitchHD = React.useCallback(async () => {
    Modal.error({
      title: t('page.newAddress.hd.qrCode.switch.title', [brand]),
      content: t('page.newAddress.hd.qrCode.switch.content', [brand]),
      okText: t('global.confirm'),
      onOk: async () => {
        await removeAddressAndForgetDevice(true);
        if (brand === WALLET_BRAND_TYPES.KEYSTONE) {
          history.push('/import/hardware/keystone');
        } else {
          history.push(`/import/hardware/qrcode?brand=${brand}`);
        }
      },
      okCancel: false,
      centered: true,
      closable: true,
      maskClosable: true,
      className: 'hd-manager-switch-modal modal-support-darkmode',
    });
  }, []);

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-item" onClick={openSwitchHD}>
          <RcHardwareSVG className="icon text-r-neutral-title1" />
          <span className="title">
            {t('page.newAddress.hd.qrCode.switchAnother', [brand])}
          </span>
        </div>
        <div className="toolbar-item" onClick={openAdvanced}>
          <RcSettingSVG className="icon text-r-neutral-title1" />
          <span className="title">
            {t('page.newAddress.hd.advancedSettings')}
          </span>
        </div>
      </div>

      <MainContainer
        firstFetchAccounts={firstFetchAccounts}
        setting={setting}
        loading={loading}
        HDName={brand ?? ''}
      />

      <CustomModal
        destroyOnClose
        className="AdvancedModal modal-support-darkmode"
        title={t('page.newAddress.hd.customAddressHdPath')}
        visible={visibleAdvanced}
        centered
        width={840}
        footer={[]}
        onCancel={() => setVisibleAdvanced(false)}
      >
        <AdvancedSettings
          onConfirm={onConfirmAdvanced}
          initSettingData={setting}
          brand={brand}
        />
      </CustomModal>
    </>
  );
};
