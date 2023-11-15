import { Button, InputNumber } from 'antd';
import React from 'react';
import { HDPathType, HDPathTypeButton } from './HDPathTypeButton';
import { InitAccounts } from './LedgerManager';
import { HDManagerStateContext } from './utils';
import { KEYRING_CLASS } from '@/constant';
import { useWallet } from '@/ui/utils';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

const MIN_START_NO = 1;
const MAX_START_NO = 950 + MIN_START_NO;

export const MAX_ACCOUNT_COUNT = 50;

export interface SettingData {
  type?: HDPathType;
  startNo: number;
}

export const DEFAULT_SETTING_DATA: SettingData = {
  startNo: MIN_START_NO,
};

const HDPathTypeGroup = {
  [KEYRING_CLASS.HARDWARE.LEDGER]: [
    HDPathType.LedgerLive,
    HDPathType.BIP44,
    HDPathType.Legacy,
  ],
  [KEYRING_CLASS.HARDWARE.TREZOR]: [HDPathType.BIP44],
  [KEYRING_CLASS.HARDWARE.ONEKEY]: [HDPathType.BIP44],
  [KEYRING_CLASS.MNEMONIC]: [
    HDPathType.LedgerLive,
    HDPathType.BIP44,
    HDPathType.Legacy,
  ],
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: [
    HDPathType.LedgerLive,
    HDPathType.BIP44,
    HDPathType.Legacy,
  ],
  [KEYRING_CLASS.HARDWARE.KEYSTONE]: [HDPathType.BIP44],
  [KEYRING_CLASS.HARDWARE.BITBOX02]: [HDPathType.BIP44],
};

interface Props {
  onConfirm?: (data: SettingData) => void;
  initAccounts?: InitAccounts;
  initSettingData?: SettingData;
}

export const AdvancedSettings: React.FC<Props> = ({
  onConfirm,
  initAccounts,
  initSettingData,
}) => {
  const { t } = useTranslation();
  const HDPathTypeTips = {
    [KEYRING_CLASS.HARDWARE.LEDGER]: {
      [HDPathType.LedgerLive]: t(
        'page.newAddress.hd.ledger.hdPathType.ledgerLive'
      ),
      [HDPathType.BIP44]: t('page.newAddress.hd.ledger.hdPathType.bip44'),
      [HDPathType.Legacy]: t('page.newAddress.hd.ledger.hdPathType.legacy'),
    },
    [KEYRING_CLASS.HARDWARE.TREZOR]: {
      [HDPathType.BIP44]: t('page.newAddress.hd.trezor.hdPathType.bip44'),
    },
    [KEYRING_CLASS.HARDWARE.ONEKEY]: {
      [HDPathType.BIP44]: t('page.newAddress.hd.onekey.hdPathType.bip44'),
    },
    [KEYRING_CLASS.MNEMONIC]: {
      [HDPathType.Default]: t('page.newAddress.hd.mnemonic.hdPathType.default'),
    },
    [KEYRING_CLASS.HARDWARE.GRIDPLUS]: {
      [HDPathType.LedgerLive]: t(
        'page.newAddress.hd.gridplus.hdPathType.ledgerLive'
      ),
      [HDPathType.BIP44]: t('page.newAddress.hd.gridplus.hdPathType.bip44'),
      [HDPathType.Legacy]: t('page.newAddress.hd.gridplus.hdPathType.legacy'),
    },
    [KEYRING_CLASS.HARDWARE.KEYSTONE]: {
      [HDPathType.BIP44]: t('page.newAddress.hd.keystone.hdPathType.bip44'),
    },
    [KEYRING_CLASS.HARDWARE.BITBOX02]: {
      [HDPathType.BIP44]: t('page.newAddress.hd.bitbox02.hdPathType.bip44'),
    },
  };

  const HDPathTypeTipsNoChain = {
    [KEYRING_CLASS.HARDWARE.LEDGER]: {
      [HDPathType.LedgerLive]: t(
        'page.newAddress.hd.ledger.hdPathTypeNoChain.ledgerLive'
      ),
      [HDPathType.BIP44]: t(
        'page.newAddress.hd.ledger.hdPathTypeNoChain.bip44'
      ),
      [HDPathType.Legacy]: t(
        'page.newAddress.hd.ledger.hdPathTypeNoChain.legacy'
      ),
    },
    [KEYRING_CLASS.HARDWARE.TREZOR]: {
      [HDPathType.BIP44]: t(
        'page.newAddress.hd.trezor.hdPathTypeNoChain.bip44'
      ),
    },
    [KEYRING_CLASS.HARDWARE.ONEKEY]: {
      [HDPathType.BIP44]: t(
        'page.newAddress.hd.onekey.hdPathTypeNoChain.bip44'
      ),
    },
    [KEYRING_CLASS.MNEMONIC]: {
      [HDPathType.Default]: t(
        'page.newAddress.hd.mnemonic.hdPathTypeNoChain.default'
      ),
    },
    [KEYRING_CLASS.HARDWARE.GRIDPLUS]: {
      [HDPathType.LedgerLive]: t(
        'page.newAddress.hd.gridplus.hdPathTypeNochain.ledgerLive'
      ),
      [HDPathType.BIP44]: t(
        'page.newAddress.hd.gridplus.hdPathTypeNochain.bip44'
      ),
      [HDPathType.Legacy]: t(
        'page.newAddress.hd.gridplus.hdPathTypeNochain.legacy'
      ),
    },
    [KEYRING_CLASS.HARDWARE.KEYSTONE]: {
      [HDPathType.BIP44]: t(
        'page.newAddress.hd.keystone.hdPathTypeNochain.bip44'
      ),
    },
    [KEYRING_CLASS.HARDWARE.BITBOX02]: {
      [HDPathType.BIP44]: t(
        'page.newAddress.hd.bitbox02.hdPathTypeNoChain.bip44'
      ),
    },
  };

  const [hdPathType, setHDPathType] = React.useState<HDPathType>();
  const [startNo, setStartNo] = React.useState(DEFAULT_SETTING_DATA.startNo);
  const { keyring, keyringId } = React.useContext(HDManagerStateContext);
  const wallet = useWallet();
  const [disableStartFrom, setDisableStartFrom] = React.useState(false);

  const onInputChange = React.useCallback((value: number) => {
    if (isNaN(value) || value < DEFAULT_SETTING_DATA.startNo) {
      setStartNo(DEFAULT_SETTING_DATA.startNo);
    } else if (value > MAX_START_NO) {
      setStartNo(MAX_START_NO);
    } else {
      setStartNo(value);
    }
  }, []);

  React.useEffect(() => {
    setDisableStartFrom(false);
    if (initSettingData) {
      setStartNo(initSettingData.startNo);
      setHDPathType(initSettingData.type);
    }

    wallet
      .requestKeyring(keyring, 'getMaxAccountLimit', keyringId, null)
      .then((count) => {
        if (count < MAX_ACCOUNT_COUNT) {
          setDisableStartFrom(true);
        }
      });
  }, []);

  const disabledSelectHDPath = React.useMemo(() => {
    return (
      keyring === KEYRING_CLASS.HARDWARE.TREZOR ||
      keyring === KEYRING_CLASS.HARDWARE.ONEKEY ||
      keyring === KEYRING_CLASS.MNEMONIC ||
      keyring === KEYRING_CLASS.HARDWARE.KEYSTONE ||
      keyring === KEYRING_CLASS.HARDWARE.BITBOX02
    );
  }, [keyring]);

  const isOnChain = React.useCallback(
    (type) => {
      if (disabledSelectHDPath) {
        return true;
      }
      return (
        type && initAccounts?.[type].some((account) => account.chains?.length)
      );
    },
    [disabledSelectHDPath]
  );

  const currentHdPathTypeTip = React.useMemo(() => {
    if (disabledSelectHDPath) {
      // only one type
      return HDPathTypeTips[keyring][HDPathTypeGroup[keyring][0]];
    }

    if (!hdPathType) {
      return null;
    }

    return isOnChain(hdPathType)
      ? HDPathTypeTips[keyring][hdPathType]
      : HDPathTypeTipsNoChain[keyring][hdPathType];
  }, [hdPathType, keyring, disabledSelectHDPath]);

  const handleSubmit = () =>
    onConfirm?.({
      type: hdPathType,
      startNo,
    });

  return (
    <div className="AdvancedSettings">
      <div className="group">
        <div className="label">{t('page.newAddress.hd.selectHdPath')}</div>
        <div className="group-field">
          {HDPathTypeGroup[keyring].map((type) => (
            <HDPathTypeButton
              type={type}
              onClick={setHDPathType}
              isOnChain={isOnChain(type)}
              selected={hdPathType === type}
              key={type}
            />
          ))}
        </div>
        <div className="tip">{currentHdPathTypeTip}</div>
      </div>
      <div
        className={clsx('group', {
          hidden: disableStartFrom,
        })}
      >
        <div className="label">{t('page.newAddress.hd.selectIndexTip')}</div>
        <InputNumber
          onChange={onInputChange}
          className="group-field"
          size="large"
          type="number"
          value={startNo}
          min={MIN_START_NO}
          max={MAX_START_NO}
          onPressEnter={handleSubmit}
        ></InputNumber>
        <div className="tip">
          {t('page.newAddress.hd.manageAddressFrom', [
            startNo,
            startNo + MAX_ACCOUNT_COUNT - 1,
          ])}
        </div>
      </div>

      <div className="footer">
        <Button
          className="advanced-button"
          block
          type="primary"
          onClick={handleSubmit}
        >
          {t('global.confirm')}
        </Button>
      </div>
    </div>
  );
};
