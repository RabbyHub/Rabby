import React, { useState } from 'react';
import { Modal, Input, Button } from 'antd';
import clsx from 'clsx';
import { useDebounce } from 'react-use';
import {
  GasResult,
  Tx,
  GasLevel,
  NativeToken,
} from 'background/service/openapi';
import { formatSeconds, useWallet } from 'ui/utils';
import IconGas from 'ui/assets/gas.svg';
import IconSetting from 'ui/assets/setting-gray.svg';
import IconChecked from 'ui/assets/checked.svg';
import IconUnchecked from 'ui/assets/unchecked.svg';
import IconTime from 'ui/assets/time.svg';
import IconGroup from 'ui/assets/group.svg';

interface GasSelectorProps {
  gas: GasResult;
  nativeToken: NativeToken;
  tx: Tx;
  onChange(gas: GasLevel): void;
}

const GasSelector = ({ gas, nativeToken, tx, onChange }: GasSelectorProps) => {
  const wallet = useWallet();
  const [modalVisible, setModalVisible] = useState(false);
  const [customGas, setCustomGas] = useState(Number(tx.gasPrice));
  const [gasList, setGasList] = useState<GasLevel[]>([]);
  const [selectedGas, setSelectGas] = useState<GasLevel | null>(null);
  const loadGasMarket = async () => {
    const list = await wallet.openapi.gasMarket(
      nativeToken.id,
      customGas > 0 ? customGas : undefined
    );
    setGasList(list);
  };

  const handleSelectGas = (gas: GasLevel) => {
    if (gas.price === 0) return;
    setSelectGas(gas);
  };

  const handleShowSelectModal = () => {
    setCustomGas(Number(tx.gasPrice));
    setSelectGas(null);
    setModalVisible(true);
  };

  const handleConfirmGas = () => {
    if (!selectedGas) return;
    if (selectedGas.level === 'custom') {
      onChange({
        ...selectedGas,
        price: customGas,
      });
    } else {
      onChange(selectedGas);
    }
    setModalVisible(false);
  };

  const handleCustomGasChange = (value: string) => {
    setCustomGas(Number(value) * 1e9);
  };
  useDebounce(
    () => {
      modalVisible && loadGasMarket();
    },
    500,
    [modalVisible, customGas]
  );
  return (
    <>
      <div className="gas-selector">
        <div className="left">
          <img src={IconGas} alt="gas" className="icon icon-gas" />
        </div>
        <div className="gas-info">
          <p className="text-gray-content font-medium text-13">
            {`${gas.estimated_gas_cost_value} ${nativeToken.symbol}`}/$
            {gas.estimated_gas_cost_usd_value.toFixed(2)}
          </p>
          <p className="text-gray-content text-12">
            {Number(tx.gasPrice) / 1e9} Gwei -{' '}
            {formatSeconds(gas.estimated_seconds)}
          </p>
        </div>
        <div className="right">
          <img
            src={IconSetting}
            alt="setting"
            className="icon icon-setting"
            onClick={handleShowSelectModal}
          />
        </div>
      </div>
      <Modal
        visible={modalVisible}
        title="Gas"
        className="gas-modal"
        onCancel={() => setModalVisible(false)}
        okText="Confirm"
        footer={null}
        width="360px"
        destroyOnClose
      >
        <div>
          <ul className="gas-selector-panel">
            {gasList.map((gas) => (
              <li
                key={gas.level}
                className={clsx({ checked: selectedGas?.level === gas.level })}
                onClick={() => handleSelectGas(gas)}
              >
                <div className="title">
                  {gas.level === 'custom' ? (
                    <Input
                      placeholder="Custom"
                      defaultValue={customGas / 1e9}
                      onChange={(e) => handleCustomGasChange(e.target.value)}
                    />
                  ) : (
                    gas.price / 1e9
                  )}
                  <img
                    src={
                      selectedGas?.level === gas.level
                        ? IconChecked
                        : IconUnchecked
                    }
                    className="icon icon-checked"
                  />
                </div>
                <div className="time">
                  <img src={IconTime} className="icon icon-time" />
                  {formatSeconds(gas.estimated_seconds)}
                </div>
                <div className="tx-count">
                  <img src={IconGroup} className="icon icon-group" />
                  {gas.front_tx_count} txn ahead
                </div>
              </li>
            ))}
          </ul>
          <div className="flex justify-center">
            <Button
              type="primary"
              className="w-[200px]"
              size="large"
              onClick={handleConfirmGas}
              disabled={!selectedGas}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default GasSelector;
