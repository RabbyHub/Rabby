import { Button, Form, Input, Skeleton, Slider, Tooltip } from 'antd';
import { ValidateStatus } from 'antd/lib/form/FormItem';
import { GasLevel, Tx } from 'background/service/openapi';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { CHAINS, GAS_LEVEL_TEXT, MINIMUM_GAS_LIMIT } from 'consts';
import React, { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import IconArrowDown from 'ui/assets/arrow-down.svg';
import IconInfo from 'ui/assets/infoicon.svg';
import { Popup } from 'ui/component';
import { formatTokenAmount } from 'ui/utils/number';

export interface GasSelectorResponse extends GasLevel {
  gasLimit: number;
  nonce: number;
}

interface GasSelectorProps {
  gasLimit: string | undefined;
  gas: {
    estimated_gas_cost_value: number;
    estimated_gas_cost_usd_value: number;
    success?: boolean;
    error?: null | {
      msg: string;
      code: number;
    };
  };
  version: 'v0' | 'v1' | 'v2';
  chainId: number;
  tx: Tx;
  onChange(gas: GasSelectorResponse): void;
  onMaxPriorityFeeChange(fee: number): void;
  isReady: boolean;
  recommendGasLimit: number;
  nonce: string;
  disableNonce: boolean;
  noUpdate: boolean;
  gasList: GasLevel[];
  selectedGas: GasLevel | null;
  is1559: boolean;
  isHardware: boolean;
}

const GasSelector = ({
  gasLimit,
  gas,
  chainId,
  tx,
  onChange,
  onMaxPriorityFeeChange,
  isReady,
  recommendGasLimit,
  nonce,
  disableNonce,
  gasList,
  selectedGas,
  is1559,
  isHardware,
  version,
}: GasSelectorProps) => {
  const { t } = useTranslation();
  const customerInputRef = useRef<Input>(null);
  const [afterGasLimit, setGasLimit] = useState<string | number>(
    Number(gasLimit)
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [customGas, setCustomGas] = useState<string | number>(
    Number(tx.gasPrice || tx.maxFeePerGas || 0) / 1e9
  );
  const [maxPriorityFee, setMaxPriorityFee] = useState<number>(
    selectedGas ? selectedGas.price / 1e9 : 0
  );
  const [isReal1559, setIsReal1559] = useState(false);
  const [customNonce, setCustomNonce] = useState(Number(nonce));
  const [isFirstTimeLoad, setIsFirstTimeLoad] = useState(true);
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
  const [isShowAdvanced, setIsShowAdvanced] = useState(false);
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
        nonce: Number(customNonce),
        level: selectedGas.level,
      });
    } else {
      onChange({
        ...selectedGas,
        gasLimit: Number(afterGasLimit),
        nonce: Number(customNonce),
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

  const panelSelection = (e, gas: GasLevel) => {
    e.stopPropagation();
    let target = gas;

    if (gas.level === selectedGas?.level) return;

    if (gas.level === 'custom') {
      if (selectedGas && selectedGas.level !== 'custom' && !gas.price) {
        target =
          gasList.find((item) => item.level === selectedGas.level) || gas;
      }
      setCustomGas(Number(target.price) / 1e9);
      onChange({
        ...target,
        gasLimit: Number(afterGasLimit),
        nonce: Number(customNonce || nonce),
        level: 'custom',
      });
      customerInputRef.current?.focus();
    } else {
      onChange({
        ...gas,
        gasLimit: Number(afterGasLimit),
        nonce: Number(customNonce || nonce),
        level: gas?.level,
      });
    }
  };

  const customGasConfirm = (e) => {
    const gas = {
      level: 'custom',
      price: Number(e?.target?.value),
      front_tx_count: 0,
      estimated_seconds: 0,
      base_fee: gasList[0].base_fee,
    };
    onChange({
      ...gas,
      price: Number(gas.price),
      gasLimit: Number(afterGasLimit),
      nonce: Number(customNonce || nonce),
      level: gas.level,
    });
  };

  const handleMaxPriorityFeeChange = (val: number) => {
    setMaxPriorityFee(val);
  };

  useDebounce(
    () => {
      (isReady || !isFirstTimeLoad) && handleConfirmGas();
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

  useEffect(() => {
    if (!selectedGas) return;
    setMaxPriorityFee(selectedGas.price / 1e9);
    if (selectedGas?.level !== 'custom') return;
    setCustomGas(selectedGas.price / 1e9);
  }, [selectedGas]);

  useEffect(() => {
    setCustomNonce(Number(nonce));
  }, [nonce]);

  useEffect(() => {
    if (isReady && isFirstTimeLoad) {
      setIsFirstTimeLoad(false);
    }
  }, [isReady]);

  useEffect(() => {
    onMaxPriorityFeeChange(maxPriorityFee * 1e9);
  }, [maxPriorityFee]);

  useEffect(() => {
    if (!is1559) return;
    if (selectedGas?.level === 'custom') {
      if (Number(customGas) !== maxPriorityFee) {
        setIsReal1559(true);
      } else {
        setIsReal1559(false);
      }
    } else if (selectedGas) {
      if (selectedGas?.price / 1e9 !== maxPriorityFee) {
        setIsReal1559(true);
      } else {
        setIsReal1559(false);
      }
    }
  }, [maxPriorityFee, selectedGas, customGas, is1559]);

  useEffect(() => {
    if (!modalVisible) {
      setIsShowAdvanced(false);
    }
  }, [modalVisible]);

  if (!isReady && isFirstTimeLoad)
    return (
      <>
        <div className="gas-selector pt-[15px] pb-[14px]">
          <div className="pl-[84px]">
            <div>
              <Skeleton.Input active style={{ width: 90, height: 17 }} />
            </div>
            <div>
              <Skeleton.Input active style={{ width: 70, height: 15 }} />
            </div>
          </div>
        </div>
      </>
    );

  return (
    <>
      <div className="gas-selector">
        <div className="gas-selector-card">
          <div className="gas-selector-card-title">Gas</div>
          <div className="gas-selector-card-content">
            <div className="gas-selector-card-content-item">
              <div className="gas-selector-card-gas">
                {selectedGas ? selectedGas.price / 1e9 : 0} Gwei
              </div>
              {selectedGas ? (
                <div className="gas-selector-card-tag">
                  {GAS_LEVEL_TEXT[selectedGas.level]}
                </div>
              ) : null}
            </div>

            {gas.error || !gas.success ? (
              <>
                <div className="gas-selector-card-error mt-[6px]">
                  Fail to fetch gas cost
                </div>
                {version === 'v2' && gas.error ? (
                  <div className="gas-selector-card-error-desc mt-[2px]">
                    {gas.error.msg}{' '}
                    <span className="number">#{gas.error.code}</span>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="gas-selector-card-content-item mt-[4px]">
                <div className="gas-selector-card-amount">
                  {formatTokenAmount(gas.estimated_gas_cost_value)}{' '}
                  {chain.nativeTokenSymbol}
                  &nbsp;&nbsp; ≈${gas.estimated_gas_cost_usd_value.toFixed(2)}
                </div>
              </div>
            )}
          </div>
          <div className="gas-selector-card-extra">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setModalVisible(true);
              }}
            >
              Edit
            </a>
          </div>
        </div>
      </div>
      <Popup
        height={isShowAdvanced ? 720 : 400}
        visible={modalVisible}
        title={t('Gas')}
        className="gas-modal"
        onCancel={() => setModalVisible(false)}
        destroyOnClose
        closable
      >
        <div className="gas-selector-modal-top">
          {gas.error || !gas.success ? (
            <>
              <div className="gas-selector-modal-error">
                Fail to fetch gas cost
              </div>
              {version === 'v2' && gas.error ? (
                <div className="gas-selector-modal-error-desc mt-[4px]">
                  {gas.error.msg}{' '}
                  <span className="number">#{gas.error.code}</span>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="gas-selector-modal-amount">
                {formatTokenAmount(gas.estimated_gas_cost_value)}{' '}
                {chain.nativeTokenSymbol}
              </div>
              <div className="gas-selector-modal-usd">
                ≈${gas.estimated_gas_cost_usd_value.toFixed(2)}
              </div>
            </>
          )}
        </div>
        <div className="card-container">
          <div className="card-container-title">Gas Price (Gwei)</div>
          <div className="card-container-body">
            {gasList.map((item, idx) => (
              <div
                key={`gas-item-${item.level}-${idx}`}
                className={clsx('card cursor-pointer', {
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
                      className="cursor-pointer"
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
        {!isShowAdvanced && (
          <div
            className="addvance-setting-toggle"
            onClick={() => {
              setIsShowAdvanced(true);
            }}
          >
            Advanced Settings <img src={IconArrowDown} />
          </div>
        )}
        {isShowAdvanced && (
          <div>
            {is1559 && (
              <div className="priority-slider">
                <p className="priority-slider-header">
                  Max Priority Fee: <span>{maxPriorityFee} Gwei</span>
                  <Tooltip
                    title="This chain supports EIP 1559. Setting the Max Priority Fee properly can save gas costs."
                    overlayClassName="rectangle"
                  >
                    <img src={IconInfo} className="icon icon-info" />
                  </Tooltip>
                </p>
                <div className="priority-slider-body">
                  <Slider
                    min={0}
                    max={selectedGas ? selectedGas.price / 1e9 : 0}
                    onChange={handleMaxPriorityFeeChange}
                    value={maxPriorityFee}
                    step={1}
                  />
                  <p className="priority-slider__mark">
                    <span>0</span>
                    <span>{selectedGas ? selectedGas.price / 1e9 : 0}</span>
                  </p>
                </div>
                <div className="priority-slider-footer">
                  Recommend the highest priority fee to speed up your
                  transaction
                </div>
              </div>
            )}
            {isReal1559 && isHardware && (
              <div className="hardware-1559-tip">
                Make sure your hardware wallet firmware has been upgraded to the
                version that supports EIP 1559
              </div>
            )}
            <Form onFinish={handleConfirmGas}>
              <div className="gas-limit">
                <p className="gas-limit-label flex">
                  <span className="flex-1">{t('GasLimit')}</span>
                </p>
                <div className="expanded gas-limit-panel-wrapper">
                  <Form.Item
                    className="gas-limit-panel mb-0"
                    validateStatus={validateStatus.gasLimit.status}
                  >
                    <Input
                      className="popup-input"
                      value={afterGasLimit}
                      onChange={handleGasLimitChange}
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
                    <p className="gas-limit-title mt-20">{t('Nonce')}</p>
                    <Form.Item className="gas-limit-panel mb-0" required>
                      <Input
                        className="popup-input"
                        value={customNonce}
                        onChange={handleCustomNonceChange}
                        disabled={disableNonce}
                      />
                    </Form.Item>
                    {Number(customNonce) < Number(nonce) && !disableNonce ? (
                      <p className="tip text-red-light not-italic">
                        Nonce is too low, the minimum should be {Number(nonce)}
                      </p>
                    ) : (
                      <p className="tip">{t('Modify only when necessary')}</p>
                    )}
                  </div>
                </div>
              </div>
            </Form>
          </div>
        )}
        <div className="flex justify-center mt-32 popup-footer">
          <Button
            type="primary"
            className="w-[200px]"
            size="large"
            onClick={handleModalConfirmGas}
            disabled={
              !isReady ||
              validateStatus.customGas.status === 'error' ||
              validateStatus.gasLimit.status === 'error' ||
              (Number(customNonce) < Number(nonce) && !disableNonce)
            }
          >
            {t('Confirm')}{' '}
            {Number(customNonce) < Number(nonce) && !disableNonce}
          </Button>
        </div>
      </Popup>
    </>
  );
};

export default GasSelector;
