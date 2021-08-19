import React, { useEffect, useState } from 'react';
import { Input, Button, Skeleton, Form } from 'antd';
import BigNumber from 'bignumber.js';
import { ValidateStatus } from 'antd/lib/form/FormItem';
import { useTranslation, Trans } from 'react-i18next';
import { useDebounce } from 'react-use';
import { CHAINS, GAS_LEVEL_TEXT, MINIMUM_GAS_LIMIT } from 'consts';
import { GasResult, Tx, GasLevel } from 'background/service/openapi';
import { formatSeconds, useWallet } from 'ui/utils';
import { Modal, FieldCheckbox } from 'ui/component';
import IconSetting from 'ui/assets/setting-gray.svg';
import IconArrowDown from 'ui/assets/arrow-down.svg';
import clsx from 'clsx';

export interface GasSelectorResponse extends GasLevel {
  gasLimit: number;
  nonce: number;
}

interface GasSelectorProps {
  gasLimit: string;
  gas: GasResult;
  chainId: number;
  tx: Tx;
  onChange(gas: GasSelectorResponse): void;
  isReady: boolean;
  recommendGasLimit: number;
  nonce: string;
  disableNonce: boolean;
}

const GasSelector = ({
  gasLimit,
  gas,
  chainId,
  tx,
  onChange,
  isReady,
  recommendGasLimit,
  nonce,
  disableNonce,
}: GasSelectorProps) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [advanceExpanded, setAdvanceExpanded] = useState(false);
  const [afterGasLimit, setGasLimit] = useState<string | number>(
    Number(gasLimit)
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customGas, setCustomGas] = useState<string | number>(
    Number(tx.gasPrice) / 1e9
  );
  const [customNonce, setCustomNonce] = useState(Number(nonce));
  const [errMsg, setErrMsg] = useState(null);
  const [gasList, setGasList] = useState<GasLevel[]>([
    {
      level: 'slow',
      front_tx_count: 0,
      price: 0,
      estimated_seconds: 0,
      base_fee: 0,
    },
    {
      level: 'normal',
      front_tx_count: 0,
      price: 0,
      estimated_seconds: 0,
      base_fee: 0,
    },
    {
      level: 'fast',
      front_tx_count: 0,
      price: 0,
      estimated_seconds: 0,
      base_fee: 0,
    },
    {
      level: 'custom',
      price: Number(tx.gasPrice),
      front_tx_count: 0,
      estimated_seconds: 0,
      base_fee: 0,
    },
  ]);
  const [validateStatus, setValidateStatus] = useState<
    Record<string, { status: ValidateStatus; message: string | null }>
  >({
    customGas: {
      status: 'success',
      message: null,
    },
    gasLimit: {
      status: 'success',
      message: null,
    },
  });
  const [selectedGas, setSelectGas] = useState<GasLevel | null>(null);
  const chain = Object.values(CHAINS).find((item) => item.id === chainId)!;

  const handleSetRecommendTimes = () => {
    const value = new BigNumber(recommendGasLimit).times(1.5).toFixed(0);
    setGasLimit(value);
  };

  const formValidator = () => {
    if (!afterGasLimit) {
      setValidateStatus({
        ...validateStatus,
        gasLimit: {
          status: 'error',
          message: t('GasLimitEmptyAlert'),
        },
      });
    } else if (Number(afterGasLimit) < MINIMUM_GAS_LIMIT) {
      setValidateStatus({
        ...validateStatus,
        gasLimit: {
          status: 'error',
          message: t('GasLimitMinimumValueAlert'),
        },
      });
    } else {
      setValidateStatus({
        ...validateStatus,
        gasLimit: {
          status: 'success',
          message: null,
        },
      });
    }
    if (selectedGas && selectedGas.price * 1e9 < gasList[0].base_fee) {
      setErrMsg(t('Gas price too low'));
    } else {
      setErrMsg(null);
    }
    if (selectedGas?.level === 'custom') {
      if (Number(customGas) * 1e9 < gasList[0].base_fee) {
        setErrMsg(t('Gas price too low'));
      } else {
        setErrMsg(null);
      }
    }
  };

  useEffect(() => {
    formValidator();
  }, [customGas, afterGasLimit, selectedGas, gasList]);

  const loadGasMarket = async () => {
    const list = await wallet.openapi.gasMarket(
      chain.serverId,
      customGas && customGas > 0 ? Number(customGas) * 1e9 : undefined
    );
    setGasList(
      list.map((item) =>
        item.level === 'custom' ? { ...item, price: item.price / 1e9 } : item
      )
    );
    setIsLoading(false);
  };

  const handleSelectGas = (checked: boolean, gas: GasLevel) => {
    if (!checked) {
      return;
    }
    setSelectGas(gas);
  };

  const handleShowSelectModal = () => {
    setCustomGas(Number(tx.gasPrice) / 1e9);
    setSelectGas({
      level: 'custom',
      price: Number(tx.gasPrice) / 1e9,
      front_tx_count: 0,
      estimated_seconds: 0,
      base_fee: gasList[0].base_fee,
    });
    setCustomNonce(Number(nonce));
    setModalVisible(true);
  };

  const handleConfirmGas = () => {
    if (!selectedGas) return;
    if (selectedGas.level === 'custom') {
      onChange({
        ...selectedGas,
        price: Number(customGas) * 1e9,
        gasLimit: Number(afterGasLimit),
        nonce: customNonce,
      });
    } else {
      onChange({
        ...selectedGas,
        gasLimit: Number(afterGasLimit),
        nonce: customNonce,
      });
    }
    setModalVisible(false);
  };

  const handleCustomGasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (/^\d*(\.\d*)?$/.test(e.target.value)) {
      setCustomGas(e.target.value);
    }
  };

  const handleGasLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (/^\d*$/.test(e.target.value)) {
      setGasLimit(e.target.value);
    }
  };

  const handleCustomNonceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (/^\d*$/.test(e.target.value)) {
      setCustomNonce(Number(e.target.value));
    }
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
      <div
        className="gas-selector gray-section-block"
        onClick={handleShowSelectModal}
      >
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
          <img src={IconSetting} alt="setting" className="icon icon-setting" />
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
          <div className={clsx('gas-selector-panel', { invalid: !!errMsg })}>
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
                          <Form.Item
                            className="relative input-wrapper mb-0"
                            validateStatus={validateStatus.customGas.status}
                          >
                            <Input
                              placeholder="Custom"
                              value={customGas}
                              defaultValue={customGas}
                              onChange={handleCustomGasChange}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              autoFocus
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
          {errMsg && <p className="mt-20 text-red-light mb-0">{errMsg}</p>}
          <div className="gas-limit mt-20">
            <p className="section-title flex">
              <span className="flex-1">
                {advanceExpanded ? t('GasLimit') : ''}
              </span>
              <span
                className="text-right cursor-pointer"
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
              <Form.Item
                className="gas-limit-panel mb-0"
                validateStatus={validateStatus.gasLimit.status}
              >
                <Input
                  value={afterGasLimit}
                  onChange={handleGasLimitChange}
                  bordered={false}
                />
              </Form.Item>
              {validateStatus.gasLimit.message ? (
                <p className="tip text-red-light not-italic">
                  {validateStatus.gasLimit.message}
                </p>
              ) : (
                <p className="tip">
                  <Trans
                    i18nKey="RecommendGasLimitTip"
                    values={{
                      est: Number(recommendGasLimit),
                      current: new BigNumber(
                        Number(afterGasLimit) / recommendGasLimit
                      ).toFixed(1),
                    }}
                  />
                  <span
                    className="recommend-times"
                    onClick={handleSetRecommendTimes}
                  >
                    1.5x
                  </span>
                  .
                </p>
              )}
              <div className={clsx({ 'opacity-50': disableNonce })}>
                <p className="section-title mt-20">{t('Nonce')}</p>
                <Form.Item className="gas-limit-panel mb-0" required>
                  <Input
                    value={customNonce}
                    onChange={handleCustomNonceChange}
                    bordered={false}
                    disabled={disableNonce}
                  />
                </Form.Item>
                <p className="tip">{t('Modify only when necessary')}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-32">
            <Button
              type="primary"
              className="w-[200px]"
              size="large"
              onClick={handleConfirmGas}
              disabled={
                !selectedGas ||
                isLoading ||
                validateStatus.customGas.status === 'error' ||
                validateStatus.gasLimit.status === 'error' ||
                errMsg !== null
              }
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
