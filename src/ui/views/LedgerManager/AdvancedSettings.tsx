import { Button, InputNumber } from 'antd';
import React from 'react';
import { HDPathType, HDPathTypeButton } from './HDPathTypeButton';

const MIN_START_NO = 1;
const MAX_START_NO = 950 + MIN_START_NO;
const HDPathTypeGroup = [
  HDPathType.LedgerLive,
  HDPathType.BIP44,
  HDPathType.Legacy,
];

export interface SettingData {
  type: HDPathType;
  startNo: number;
}

export const DEFAULT_SETTING_DATA: SettingData = {
  type: HDPathType.LedgerLive,
  startNo: MIN_START_NO,
};

const HDPathTypeTips = {
  [HDPathType.LedgerLive]:
    'Ledger Live: Ledger official HD path. In the first 3 addresses, there are addresses used on-chain.',
  [HDPathType.BIP44]:
    'BIP44 Standard: HDpath defined by the BIP44 protocol. In the first 3 addresses, there are addresses used on-chain.',
  [HDPathType.Legacy]:
    'Legacy: HD path used by MEW / Mycrypto. In the first 3 addresses, there are addresses used on-chain.',
};

interface Props {
  onConfirm?: (data: SettingData) => void;
}

export const AdvancedSettings: React.FC<Props> = ({ onConfirm }) => {
  const [hdPathType, setHDPathType] = React.useState<HDPathType>(
    DEFAULT_SETTING_DATA.type
  );
  const [startNo, setStartNo] = React.useState(DEFAULT_SETTING_DATA.startNo);

  const onInputChange = React.useCallback((value: number) => {
    if (isNaN(value) || value < DEFAULT_SETTING_DATA.startNo) {
      setStartNo(DEFAULT_SETTING_DATA.startNo);
    } else if (value > MAX_START_NO) {
      setStartNo(MAX_START_NO);
    } else {
      setStartNo(value);
    }
  }, []);

  return (
    <div className="AdvancedSettings">
      <div className="group">
        <div className="label">Select HD path:</div>
        <div className="group-field">
          {HDPathTypeGroup.map((type) => (
            <HDPathTypeButton
              type={type}
              onClick={setHDPathType}
              isOnChain={true}
              selected={hdPathType === type}
              key={type}
            />
          ))}
        </div>
        <div className="tip">{HDPathTypeTips[hdPathType]}</div>
      </div>
      <div className="group">
        <div className="label">
          Select the serial number of addresses to start from:
        </div>
        <InputNumber
          onChange={onInputChange}
          className="group-field"
          size="large"
          type="number"
          defaultValue={MIN_START_NO}
          min={MIN_START_NO}
          max={MAX_START_NO}
        ></InputNumber>
        <div className="tip">
          Manage address from {startNo} to {startNo + 49}
        </div>
      </div>

      <div className="footer">
        <Button
          className="advanced-button"
          block
          type="primary"
          onClick={() =>
            onConfirm?.({
              type: hdPathType,
              startNo,
            })
          }
        >
          Confirm
        </Button>
      </div>
    </div>
  );
};
