import React, { useState } from 'react';
import { Input, Button, Skeleton } from 'antd';
import { useDebounce } from 'react-use';
import { CHAINS, GAS_LEVEL_TEXT } from 'consts';
import { GasResult, Tx, GasLevel } from 'background/service/openapi';
import { formatSeconds, useWallet } from 'ui/utils';
import { Modal, FieldCheckbox } from 'ui/component';
import IconSetting from 'ui/assets/setting-gray.svg';

interface GasSelectorProps {
  gas: GasResult;
  chainId: number;
  tx: Tx;
  onChange(gas: GasLevel): void;
  isReady: boolean;
}

const GasSelector = ({
  gas,
  chainId,
  tx,
  onChange,
  isReady,
}: GasSelectorProps) => {
  const wallet = useWallet();
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customGas, setCustomGas] = useState(Number(tx.gasPrice));
  const [gasList, setGasList] = useState<GasLevel[]>([
    {
      level: 'slow',
      front_tx_count: 0,
      price: 0,
      estimated_seconds: 0,
    },
    {
      level: 'normal',
      front_tx_count: 0,
      price: 0,
      estimated_seconds: 0,
    },
    {
      level: 'fast',
      front_tx_count: 0,
      price: 0,
      estimated_seconds: 0,
    },
    {
      level: 'custom',
      price: Number(tx.gasPrice),
      front_tx_count: 0,
      estimated_seconds: 0,
    },
  ]);
  const [selectedGas, setSelectGas] = useState<GasLevel | null>(null);
  const chain = Object.values(CHAINS).find((item) => item.id === chainId)!;

  const loadGasMarket = async () => {
    const list = await wallet.openapi.gasMarket(
      chain.serverId,
      customGas > 0 ? customGas : undefined
    );
    setGasList(list);
    setIsLoading(false);
  };

  const handleSelectGas = (checked: boolean, gas: GasLevel) => {
    if (!checked) {
      setSelectGas(null);
      return;
    }
    if (gas.price === 0) return;
    setSelectGas(gas);
  };

  const handleShowSelectModal = () => {
    setCustomGas(Number(tx.gasPrice));
    setSelectGas({
      level: 'custom',
      price: Number(tx.gasPrice),
      front_tx_count: 0,
      estimated_seconds: 0,
    });
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

  if (!isReady)
    return (
      <>
        <p className="section-title">Est. gas cost</p>
        <div className="gas-selector gray-section-block">
          <div className="gas-info">
            <Skeleton.Input style={{ width: 200 }} />
          </div>
        </div>
      </>
    );

  return (
    <>
      <p className="section-title">Est. gas cost</p>
      <div className="gas-selector gray-section-block">
        <div className="gas-info">
          <p className="text-gray-content text-14">
            {`${gas.estimated_gas_cost_value} ${chain.nativeTokenSymbol}`} ≈ $
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
        title="Select Gas Setting"
        className="gas-modal"
        onCancel={() => setModalVisible(false)}
        okText="Confirm"
        destroyOnClose
      >
        <div>
          <p className="section-title">Gas price (Gwei)</p>
          <div className="gas-selector-panel">
            {gasList.map((gas) => (
              <FieldCheckbox
                checked={selectedGas?.level === gas.level}
                onChange={(checked: boolean) => handleSelectGas(checked, gas)}
                showCheckbox={!isLoading}
              >
                <div className="gas-content">
                  {isLoading ? (
                    <>
                      <div className="gas-content__info">
                        <p className="text-gray-title text-13 font-medium mb-4">
                          <Skeleton.Input style={{ width: 80 }} />
                        </p>
                        <p className="text-gray-content text-12 mb-0">
                          <Skeleton.Input style={{ width: 128 }} />
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="gas-content__info">
                        <p className="text-gray-title text-13 font-medium mb-0">
                          {GAS_LEVEL_TEXT[gas.level]}
                        </p>
                        <p className="text-gray-content text-12 mb-0">
                          {formatSeconds(gas.estimated_seconds)} -{' '}
                          {gas.front_tx_count} txn ahead
                        </p>
                      </div>
                      <div className="gas-content__price">
                        {gas.level === 'custom' ? (
                          <div className="relative input-wrapper">
                            <Input
                              placeholder="Custom"
                              defaultValue={customGas / 1e9}
                              onChange={(e) =>
                                handleCustomGasChange(e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        ) : (
                          gas.price / 1e9
                        )}
                      </div>
                    </>
                  )}
                </div>
              </FieldCheckbox>
            ))}
          </div>
          <div className="flex justify-center mt-40">
            <Button
              type="primary"
              className="w-[200px]"
              size="large"
              onClick={handleConfirmGas}
              disabled={!selectedGas || isLoading}
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
