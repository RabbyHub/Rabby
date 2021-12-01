import React, { useEffect, useState, useRef } from 'react';
import { Input, Button, Skeleton, Form } from 'antd';
import BigNumber from 'bignumber.js';
import { ValidateStatus } from 'antd/lib/form/FormItem';
import { useTranslation, Trans } from 'react-i18next';
import { useDebounce } from 'react-use';
import { CHAINS, GAS_LEVEL_TEXT, MINIMUM_GAS_LIMIT } from 'consts';
import { GasResult, Tx, GasLevel } from 'background/service/openapi';
import { useWallet } from 'ui/utils';
import { Modal } from 'ui/component';
import IconSetting from 'ui/assets/setting-gray.svg';
import clsx from 'clsx';
import { ChainGas } from 'background/service/preference';
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
  isFristLoad: boolean;
  noUpdate: boolean;
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
  isFristLoad,
  noUpdate,
}: GasSelectorProps) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const customerInputRef = useRef<Input>(null);
  const [advanceExpanded, setAdvanceExpanded] = useState(true);
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
      price: Number(tx.gasPrice) / 1e9, // when level is custom this price is gwei, but when level is not custom, it's wei
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
    if (noUpdate) {
      setSelectGas({
        level: 'custom',
        price: gas?.estimated_gas_cost_usd_value,
        front_tx_count: gas?.front_tx_count,
        estimated_seconds: gas?.estimated_seconds,
        base_fee: gasList[0].base_fee,
      });
    } else if (!selectedGas) {
      await getLastTimeSavedGas();
    }
    setIsLoading(false);
  };

  const handleShowSelectModal = () => {
    setModalVisible(true);
  };

  const handleConfirmGas = () => {
    if (!selectedGas) return;
    if (selectedGas.level === 'custom') {
      onChange({
        ...selectedGas,
        price: Number(customGas) * 1e9,
        gasLimit: Number(afterGasLimit),
        nonce: Number(customNonce || nonce),
        level: selectedGas.level,
      });
    } else {
      onChange({
        ...selectedGas,
        gasLimit: Number(afterGasLimit),
        nonce: Number(customNonce || nonce),
        level: selectedGas.level,
      });
    }
  };

  const handleModalConfirmGas = () => {
    handleConfirmGas();
    setModalVisible(false);
  };

  const handleCustomGasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
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

  const getLastTimeSavedGas = async () => {
    const savedGas: ChainGas = await wallet.getLastTimeGasSelection(chainId);
    if (savedGas?.gasPrice) {
      setCustomGas(Number(savedGas?.gasPrice) / 1e9);
    }
    if (savedGas?.lastTimeSelect && savedGas?.lastTimeSelect === 'gasLevel') {
      const lastSelected = gasList.find(
        (item) => item.level === savedGas?.gasLevel
      );
      lastSelected && setSelectGas(lastSelected);
    } else if (
      savedGas?.lastTimeSelect &&
      savedGas?.lastTimeSelect === 'gasPrice'
    ) {
      setSelectGas({
        level: 'custom',
        price: (savedGas?.gasPrice || 0) / 1e9,
        front_tx_count: 0,
        estimated_seconds: 0,
        base_fee: gasList[0].base_fee,
      });
      setCustomGas((savedGas?.gasPrice && savedGas?.gasPrice / 1e9) || 0);
    } else if (tx && tx.gasPrice) {
      setSelectGas({
        level: 'custom',
        price: parseInt(tx.gasPrice) / 1e9,
        front_tx_count: gas?.front_tx_count,
        estimated_seconds: gas?.estimated_seconds,
        base_fee: gasList[0].base_fee,
      });
      setCustomGas(parseInt(tx.gasPrice) / 1e9);
    } else if (gasList.length > 0) {
      const gas = gasList.find((item) => item.level === 'fast') || null;
      setSelectGas(gas);
    }
  };

  const panelSelection = (e, gas: GasLevel) => {
    e.stopPropagation();
    setIsLoading(true);
    let target = gas;
    if (gas.level === 'custom') {
      if (selectedGas && selectedGas.level !== 'custom') {
        target =
          gasList.find((item) => item.level === selectedGas.level) || gas;
      }
      setCustomGas(
        target.level === 'custom'
          ? Number(target.price)
          : Number(target.price) / 1e9
      );
      setSelectGas({
        level: 'custom',
        price: Number(target.price) / 1e9,
        front_tx_count: 0,
        estimated_seconds: 0,
        base_fee: gasList[0].base_fee,
      });
      onChange({
        ...target,
        price:
          target.level === 'custom'
            ? Number(target.price) * 1e9
            : Number(target.price),
        gasLimit: Number(afterGasLimit),
        nonce: Number(customNonce || nonce),
        level: target?.level,
      });
    } else {
      setSelectGas(gas);
      onChange({
        ...gas,
        gasLimit: Number(afterGasLimit),
        nonce: Number(customNonce || nonce),
        level: gas?.level,
      });
    }
    setIsLoading(false);
  };
  const customGasConfirm = (e) => {
    setIsLoading(true);
    const gas = {
      level: 'custom',
      price: Number(e?.target?.value),
      front_tx_count: 0,
      estimated_seconds: 0,
      base_fee: gasList[0].base_fee,
    };
    setSelectGas(gas);
    onChange({
      ...gas,
      price: Number(gas.price) * 1e9,
      gasLimit: Number(afterGasLimit),
      nonce: Number(customNonce || nonce),
      level: gas.level,
    });
    setIsLoading(false);
  };
  useDebounce(
    () => {
      loadGasMarket();
      !isFristLoad && handleConfirmGas();
    },
    500,
    [customGas]
  );

  useEffect(() => {
    setGasLimit(Number(gasLimit));
  }, [gasLimit]);
  useEffect(() => {
    formValidator();
  }, [afterGasLimit, selectedGas, gasList]);
  if (!isReady && isFristLoad)
    return (
      <>
        <p className="section-title">{t('gasCostTitle')}</p>
        <div className="gas-selector gray-section-block">
          <div className="gas-info">
            <Skeleton.Input active style={{ width: 200 }} />
          </div>
          <div className="flex mt-15">
            <Skeleton.Button
              active
              style={{ width: 72, height: 48, marginRight: 4 }}
            />
            <Skeleton.Button
              active
              style={{ width: 72, height: 48, marginLeft: 4, marginRight: 4 }}
            />
            <Skeleton.Button
              active
              style={{ width: 72, height: 48, marginLeft: 4, marginRight: 4 }}
            />
            <Skeleton.Button
              active
              style={{ width: 72, height: 48, marginLeft: 4 }}
            />
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
        <div className="top">
          <p className="usmoney">
            ≈ ${gas.estimated_gas_cost_usd_value.toFixed(2)}
          </p>
          <p className="gasmoney">
            {`${gas.estimated_gas_cost_value} ${chain.nativeTokenSymbol}`}
          </p>
          <div className="right">
            <img
              src={IconSetting}
              alt="setting"
              className="icon icon-setting"
            />
          </div>
        </div>
        <div className="card-container">
          {gasList.map((item) => (
            <div
              className={clsx('card', {
                active: selectedGas?.level === item.level,
              })}
              onClick={(e) => panelSelection(e, item)}
            >
              <div className="gas-level">{t(GAS_LEVEL_TEXT[item.level])}</div>
              <div
                className={clsx('cardTitle', {
                  'custom-input': item.level === 'custom',
                  active: selectedGas?.level === item.level,
                })}
              >
                {item.level === 'custom' ? (
                  <Input
                    value={customGas}
                    defaultValue={customGas}
                    onChange={handleCustomGasChange}
                    onClick={(e) => panelSelection(e, item)}
                    onPressEnter={customGasConfirm}
                    ref={customerInputRef}
                    autoFocus={selectedGas?.level === item.level}
                    min={0}
                    bordered={false}
                  />
                ) : (
                  item.price / 1e9
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Modal
        visible={modalVisible}
        title={t('Advanced Options')}
        className="gas-modal"
        onCancel={() => setModalVisible(false)}
        okText="Confirm"
        destroyOnClose
      >
        <Form onFinish={handleConfirmGas}>
          {errMsg && <p className="mt-20 text-red-light mb-0">{errMsg}</p>}
          <div className="gas-limit">
            <p className="section-title flex">
              <span className="flex-1">{t('GasLimit')}</span>
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
                    value={customNonce || Number(nonce)}
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
              onClick={handleModalConfirmGas}
              disabled={
                !selectedGas ||
                isLoading ||
                validateStatus.customGas.status === 'error' ||
                validateStatus.gasLimit.status === 'error'
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
