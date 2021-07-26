import React, { useEffect, useState } from 'react';
import { InputNumber, Button, Skeleton, Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import { CHAINS, GAS_LEVEL_TEXT } from 'consts';
import { GasResult, Tx, GasLevel } from 'background/service/openapi';
import { formatSeconds, useWallet } from 'ui/utils';
import { Modal, FieldCheckbox } from 'ui/component';
import IconSetting from 'ui/assets/setting-gray.svg';
import IconArrowDown from 'ui/assets/arrow-down.svg';
import clsx from 'clsx';

export interface GasSelectorResponse extends GasLevel {
  gasLimit: number;
}

interface GasSelectorProps {
  gasLimit: string;
  gas: GasResult;
  chainId: number;
  tx: Tx;
  onChange(gas: GasSelectorResponse): void;
  isReady: boolean;
}

const GasSelector = ({
  gasLimit,
  gas,
  chainId,
  tx,
  onChange,
  isReady,
}: GasSelectorProps) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [advanceExpanded, setAdvanceExpanded] = useState(false);
  const [afterGasLimit, setGasLimit] = useState(Number(gasLimit));
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
        gasLimit: afterGasLimit,
      });
    } else {
      onChange({ ...selectedGas, gasLimit: afterGasLimit });
    }
    setModalVisible(false);
  };

  const handleCustomGasChange = (value: number) => {
    setCustomGas(Number(value) * 1e9);
  };

  const handleGasLimitChange = (value: number) => {
    setGasLimit(Number(value));
  };

  const handleClickAdvance = () => {
    setAdvanceExpanded(!advanceExpanded);
  };

  useDebounce(
    () => {
      modalVisible && loadGasMarket();
    },
    500,
    [modalVisible, customGas]
  );

  useEffect(() => {
    setGasLimit(Number(gasLimit));
  }, [gasLimit]);

  if (!isReady)
    return (
      <>
        <p className="section-title">{t('gasCostTitle')}</p>
        <div className="gas-selector gray-section-block">
          <div className="gas-info">
            <Skeleton.Input active style={{ width: 200 }} />
          </div>
        </div>
      </>
    );

  return (
    <>
      <p className="section-title">{t('gasCostTitle')}</p>
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
        title={t('Select Gas Setting')}
        className="gas-modal"
        onCancel={() => setModalVisible(false)}
        okText="Confirm"
        destroyOnClose
      >
        <Form onFinish={handleConfirmGas}>
          <p className="section-title">{t('gasPriceTitle')}</p>
          <div className="gas-selector-panel">
            {gasList.map((gas) => (
              <FieldCheckbox
                className="mt-8"
                checked={selectedGas?.level === gas.level}
                onChange={(checked: boolean) => handleSelectGas(checked, gas)}
                showCheckbox={!isLoading}
                checkboxSize={16}
              >
                <div className="gas-content">
                  {isLoading ? (
                    <>
                      <div className="gas-content__info">
                        <p className="text-gray-title text-13 font-medium leading-none mb-4">
                          <Skeleton.Input active style={{ width: 80 }} />
                        </p>
                        <p className="text-gray-content text-12 mb-0">
                          <Skeleton.Input active style={{ width: 128 }} />
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="gas-content__info">
                        <p className="text-gray-title text-13 font-medium leading-none mb-4">
                          {t(GAS_LEVEL_TEXT[gas.level])}
                        </p>
                        <p className="text-gray-content text-12 mb-0">
                          {formatSeconds(gas.estimated_seconds)} -{' '}
                          {gas.front_tx_count} {t('txn ahead')}
                        </p>
                      </div>
                      <div className="gas-content__price">
                        {gas.level === 'custom' ? (
                          <Form.Item className="relative input-wrapper mb-0">
                            <InputNumber
                              placeholder="Custom"
                              defaultValue={customGas / 1e9}
                              onChange={handleCustomGasChange}
                              onClick={(e) => e.stopPropagation()}
                              min={0}
                            />
                          </Form.Item>
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
          <div className="gas-limit mt-20">
            <p className="section-title flex">
              <span>{advanceExpanded ? t('Gas limit') : ''}</span>
              <span
                className="flex-1 text-right cursor-pointer"
                onClick={handleClickAdvance}
              >
                {t('Advanced Options')}
                <img
                  className={clsx('icon icon-arrow-down inline-block ml-4', {
                    expanded: advanceExpanded,
                  })}
                  src={IconArrowDown}
                />
              </span>
            </p>
            <div
              className={clsx('gas-limit-panel-wrapper', {
                expanded: advanceExpanded,
              })}
            >
              <Form.Item className="gas-limit-panel mb-0">
                <InputNumber
                  value={afterGasLimit}
                  onChange={handleGasLimitChange}
                  min={0}
                  bordered={false}
                />
              </Form.Item>
              <p className="tip">
                Est. {Number(tx.gas)}. Current 1.0x, recommended 1.5x.
              </p>
            </div>
          </div>
          <div className="flex justify-center mt-32">
            <Button
              type="primary"
              className="w-[200px]"
              size="large"
              onClick={handleConfirmGas}
              disabled={!selectedGas || isLoading}
            >
              {t('Confirm')}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default GasSelector;
