import { Button, InputNumber } from 'antd';
import React from 'react';
import { HDPathType, HDPathTypeButton } from './HDPathTypeButton';
import { InitAccounts } from './LedgerManager';
import { HDManagerStateContext } from './utils';
import { KEYRING_CLASS } from '@/constant';
import { useWallet } from '@/ui/utils';
import clsx from 'clsx';

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
  [KEYRING_CLASS.MNEMONIC]: [HDPathType.Default],
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: [
    HDPathType.LedgerLive,
    HDPathType.BIP44,
    HDPathType.Legacy,
  ],
  [KEYRING_CLASS.HARDWARE.KEYSTONE]: [HDPathType.BIP44],
  [KEYRING_CLASS.HARDWARE.BITBOX02]: [HDPathType.BIP44],
};

const HDPathTypeTips = {
  [KEYRING_CLASS.HARDWARE.LEDGER]: {
    [HDPathType.LedgerLive]:
      'Ledger Live: Ledger official HD path. In the first 3 addresses, there are addresses used on-chain.',
    [HDPathType.BIP44]:
      'BIP44 Standard: HDpath defined by the BIP44 protocol. In the first 3 addresses, there are addresses used on-chain.',
    [HDPathType.Legacy]:
      'Legacy: HD path used by MEW / Mycrypto. In the first 3 addresses, there are addresses used on-chain.',
  },
  [KEYRING_CLASS.HARDWARE.TREZOR]: {
    [HDPathType.BIP44]: 'BIP44: HDpath defined by the BIP44 protocol.',
  },
  [KEYRING_CLASS.HARDWARE.ONEKEY]: {
    [HDPathType.BIP44]: 'BIP44: HDpath defined by the BIP44 protocol.',
  },
  [KEYRING_CLASS.MNEMONIC]: {
    [HDPathType.Default]:
      'Default: The Default HD path for importing a seed phrase is used.',
  },
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: {
    [HDPathType.LedgerLive]:
      'Ledger Live: Ledger official HD path. In the first 3 addresses, there are addresses used on-chain.',
    [HDPathType.BIP44]:
      'BIP44 Standard: HDpath defined by the BIP44 protocol. In the first 3 addresses, there are addresses used on-chain.',
    [HDPathType.Legacy]:
      'Legacy: HD path used by MEW / Mycrypto. In the first 3 addresses, there are addresses used on-chain.',
  },
  [KEYRING_CLASS.HARDWARE.KEYSTONE]: {
    [HDPathType.BIP44]: 'BIP44: HDpath defined by the BIP44 protocol.',
  },
  [KEYRING_CLASS.HARDWARE.BITBOX02]: {
    [HDPathType.BIP44]: 'BIP44: HDpath defined by the BIP44 protocol.',
  },
};

const HDPathTypeTipsNoChain = {
  [KEYRING_CLASS.HARDWARE.LEDGER]: {
    [HDPathType.LedgerLive]:
      'Ledger Live: Ledger official HD path. In the first 3 addresses, there are no addresses used on-chain.',
    [HDPathType.BIP44]:
      'BIP44 Standard: HD path defined by the BIP44 protocol. In the first 3 addresses, there are no addresses used on-chain.',
    [HDPathType.Legacy]:
      'Legacy: HD path used by MEW / Mycrypto. In the first 3 addresses, there are no addresses used on-chain.',
  },
  [KEYRING_CLASS.HARDWARE.TREZOR]: {
    [HDPathType.BIP44]: 'BIP44: HDpath defined by the BIP44 protocol.',
  },
  [KEYRING_CLASS.HARDWARE.ONEKEY]: {
    [HDPathType.BIP44]: 'BIP44: HDpath defined by the BIP44 protocol.',
  },
  [KEYRING_CLASS.MNEMONIC]: {
    [HDPathType.Default]:
      'Default: The Default HD path for importing a seed phrase is used.',
  },
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: {
    [HDPathType.LedgerLive]:
      'Ledger Live: Ledger official HD path. In the first 3 addresses, there are no addresses used on-chain.',
    [HDPathType.BIP44]:
      'BIP44 Standard: HD path defined by the BIP44 protocol. In the first 3 addresses, there are no addresses used on-chain.',
    [HDPathType.Legacy]:
      'Legacy: HD path used by MEW / Mycrypto. In the first 3 addresses, there are no addresses used on-chain.',
  },
  [KEYRING_CLASS.HARDWARE.KEYSTONE]: {
    [HDPathType.BIP44]: 'BIP44: HDpath defined by the BIP44 protocol.',
  },
  [KEYRING_CLASS.HARDWARE.BITBOX02]: {
    [HDPathType.BIP44]: 'BIP44: HDpath defined by the BIP44 protocol.',
  },
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
        <div className="label">Select HD path:</div>
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
        <div className="label">
          Select the serial number of addresses to start from:
        </div>
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
          Manage address from {startNo} to {startNo + MAX_ACCOUNT_COUNT - 1}
        </div>
      </div>

      <div className="footer">
        <Button
          className="advanced-button"
          block
          type="primary"
          onClick={handleSubmit}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
};
