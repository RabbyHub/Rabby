/**
 * @deprecated new version is GasSelectorHeader.tsx
 */
import { Button, Form, Input, Skeleton, Slider, Tooltip } from 'antd';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { ValidateStatus } from 'antd/lib/form/FormItem';
import { GasLevel } from 'background/service/openapi';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import {
  CHAINS,
  MINIMUM_GAS_LIMIT,
  L2_ENUMS,
  CAN_ESTIMATE_L1_FEE_CHAINS,
} from 'consts';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import IconInfo from 'ui/assets/infoicon.svg';
import { Popup } from 'ui/component';
import { TooltipWithMagnetArrow } from 'ui/component/Tooltip/TooltipWithMagnetArrow';
import { formatTokenAmount } from 'ui/utils/number';
import { calcMaxPriorityFee } from '@/utils/transaction';
import styled, { css } from 'styled-components';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import { ReactComponent as IconArrowRight } from 'ui/assets/approval/edit-arrow-right.svg';
import { ReactComponent as RcIconAlert } from 'ui/assets/sign/tx/alert-currentcolor.svg';
import IconQuestionMark from 'ui/assets/sign/tx/question-mark.svg';
import { Chain } from '@debank/common';
import { getGasLevelI18nKey } from '@/ui/utils/trans';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { findChain } from '@/utils/chain';
import { INPUT_NUMBER_RE, filterNumber } from '@/constant/regexp';

export interface GasSelectorResponse extends GasLevel {
  gasLimit: number;
  nonce: number;
  maxPriorityFee: number;
}

interface GasSelectorProps {
  gasLimit: string | undefined;
  gas: {
    gasCostUsd: number | string | BigNumber;
    gasCostAmount: number | string | BigNumber;
    success?: boolean;
    error?: null | {
      msg: string;
      code: number;
    };
  };
  version: 'v0' | 'v1' | 'v2';
  chainId: number;
  onChange(gas: GasSelectorResponse): void;
  isReady: boolean;
  recommendGasLimit: number | string | BigNumber;
  recommendNonce: number | string | BigNumber;
  nonce: string;
  disableNonce: boolean;
  noUpdate: boolean;
  gasList: GasLevel[];
  selectedGas: GasLevel | null;
  is1559: boolean;
  isHardware: boolean;
  isCancel: boolean;
  isSpeedUp: boolean;
  gasCalcMethod: (
    price: number
  ) => Promise<{
    gasCostUsd: BigNumber;
    gasCostAmount: BigNumber;
  }>;
  disabled?: boolean;
  manuallyChangeGasLimit: boolean;
  errors: {
    code: number;
    msg: string;
    level?: 'warn' | 'danger' | 'forbidden';
  }[];
  engineResults?: Result[];
  nativeTokenBalance: string;
  gasPriceMedian: number | null;
}

const useExplainGas = ({
  price,
  method,
  value,
}: {
  price: number;
  method: GasSelectorProps['gasCalcMethod'];
  value: {
    gasCostUsd: BigNumber;
    gasCostAmount: BigNumber;
  };
}) => {
  const [result, setResult] = useState<{
    gasCostUsd: BigNumber;
    gasCostAmount: BigNumber;
  }>(value);
  useEffect(() => {
    method(price).then(setResult);
  }, [price, method]);

  return result;
};

const CardBody = styled.div<{
  $disabled?: boolean;
}>`
  display: flex;
  justify-content: space-between;
  width: 100%;
  gap: 8px;

  ${({ $disabled }) =>
    $disabled
      ? css`
          opacity: 0.5;
          cursor: not-allowed;
        `
      : css`
          .card {
            cursor: pointer;

            &:hover {
              border: 1px solid var(--r-blue-default, #7084ff);
            }

            &.active {
              background: var(--r-blue-light-1, #eef1ff);
              border: 1px solid var(--r-blue-default, #7084ff);
            }
          }

          .cardTitle {
            &.active {
              color: var(--r-blue-default, #7084ff) !important;
            }
          }
        `}

  .card {
    width: 76px;
    height: 52px;
    background: var(--r-neutral-card-3, #f7fafc);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    border: 1px solid transparent;

    .gas-level,
    .cardTitle {
      text-align: center;
      font-size: 12px;
      line-height: 14px;
      color: var(--r-neutral-body, #3e495e);
      margin: 8px auto 0;
    }
    .cardTitle {
      color: var(--r-neutral-title-1, #192945) !important;
      font-weight: 500;
      font-size: 13px !important;
      margin: 4px auto 0;
      .ant-input {
        background: transparent;
      }
    }
    .custom-input {
      margin: 4px auto 0;
    }
    .ant-input {
      text-align: center !important;
      font-size: 13px !important;
      font-weight: 500;
      color: var(--r-neutral-title-1, #192945);
      padding-top: 0;
      transition: none;
      &.active {
        color: var(--r-blue-default, #7084ff) !important;
      }
    }
    .ant-input:focus,
    .ant-input-focused {
      color: var(--r-neutral-title-1);
    }
  }
`;

const ManuallySetGasLimitAlert = styled.div`
  font-weight: 400;
  font-size: 13px;
  line-height: 15px;
  margin-top: 10px;
  color: var(--r-neutral-body);
`;

const ErrorsWrapper = styled.div`
  border-top: 0.5px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
  padding-top: 14px;
  margin-top: 14px;
  .item {
    display: flex;
    font-weight: 500;
    font-size: 14px;
    line-height: 16px;
    color: var(--r-neutral-body, #3e495e);
    margin-bottom: 10px;
    align-items: flex-start;
    .icon-alert {
      width: 15px;
      margin-right: 8px;
    }
    &:nth-last-child(1) {
      margin-bottom: 0;
    }
  }
`;

const GasSelector = ({
  gasLimit,
  gas,
  chainId,
  onChange,
  isReady,
  recommendGasLimit,
  recommendNonce,
  nonce,
  disableNonce,
  gasList,
  selectedGas: rawSelectedGas,
  is1559,
  isHardware,
  version,
  gasCalcMethod,
  disabled,
  manuallyChangeGasLimit,
  errors,
  engineResults = [],
  nativeTokenBalance,
  gasPriceMedian,
  isCancel,
  isSpeedUp,
}: GasSelectorProps) => {
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();
  const customerInputRef = useRef<Input>(null);
  const [afterGasLimit, setGasLimit] = useState<string | number>(
    Number(gasLimit)
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [customGas, setCustomGas] = useState<string | number>('0');
  const [selectedGas, setSelectedGas] = useState<GasLevel | null>(
    rawSelectedGas
  );
  const [maxPriorityFee, setMaxPriorityFee] = useState<number>(
    selectedGas
      ? (selectedGas.priority_price === null
          ? selectedGas.price
          : selectedGas.priority_price) / 1e9
      : 0
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
    nonce: {
      status: 'success',
      message: null,
    },
  });
  const chain = findChain({
    id: chainId,
  })!;

  const { rules, processedRules } = useRabbySelector((s) => ({
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
  }));

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

  const handleSetRecommendTimes = () => {
    if (disabled) return;
    const value = new BigNumber(recommendGasLimit).times(1.5).toFixed(0);
    setGasLimit(value);
  };

  const formValidator = () => {
    if (!afterGasLimit) {
      setValidateStatus({
        ...validateStatus,
        gasLimit: {
          status: 'error',
          message: t('page.signTx.gasLimitEmptyAlert'),
        },
      });
    } else if (Number(afterGasLimit) < MINIMUM_GAS_LIMIT) {
      setValidateStatus({
        ...validateStatus,
        gasLimit: {
          status: 'error',
          message: t('page.signTx.gasLimitMinValueAlert'),
        },
      });
    } else if (new BigNumber(customNonce).lt(recommendNonce) && !disableNonce) {
      setValidateStatus({
        ...validateStatus,
        nonce: {
          status: 'error',
          message: t('page.signTx.nonceLowerThanExpect', [
            new BigNumber(recommendNonce).toString(),
          ]),
        },
      });
    } else {
      setValidateStatus({
        ...validateStatus,
        gasLimit: {
          status: 'success',
          message: null,
        },
        nonce: {
          status: 'success',
          message: null,
        },
      });
    }
  };

  const modalExplainGas = useExplainGas({
    price: selectedGas?.price || 0,
    method: gasCalcMethod,
    value: {
      gasCostAmount: new BigNumber(gas.gasCostAmount),
      gasCostUsd: new BigNumber(gas.gasCostUsd),
    },
  });

  const handleConfirmGas = () => {
    if (!selectedGas) return;
    if (selectedGas.level === 'custom') {
      onChange({
        ...selectedGas,
        price: Number(customGas) * 1e9,
        gasLimit: Number(afterGasLimit),
        nonce: Number(customNonce),
        level: selectedGas.level,
        maxPriorityFee: maxPriorityFee * 1e9,
      });
    } else {
      onChange({
        ...selectedGas,
        gasLimit: Number(afterGasLimit),
        nonce: Number(customNonce),
        level: selectedGas.level,
        maxPriorityFee: maxPriorityFee * 1e9,
      });
    }
  };

  const handleModalConfirmGas = () => {
    handleConfirmGas();
    setModalVisible(false);
  };

  const handleCustomGasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (INPUT_NUMBER_RE.test(e.target.value)) {
      setCustomGas(filterNumber(e.target.value));
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

  const handleClickEdit = () => {
    setModalVisible(true);
    setSelectedGas(rawSelectedGas);
    setGasLimit(Number(gasLimit));
    setCustomNonce(Number(nonce));
    matomoRequestEvent({
      category: 'Transaction',
      action: 'EditGas',
      label: chain?.serverId,
    });
  };

  const panelSelection = (e, gas: GasLevel) => {
    e.stopPropagation();
    const target = gas;

    if (gas.level === selectedGas?.level) return;

    if (gas.level === 'custom') {
      setSelectedGas({
        ...target,
        level: 'custom',
      });
      customerInputRef.current?.focus();
    } else {
      setSelectedGas({
        ...gas,
        level: gas?.level,
      });
    }
  };

  const handlePanelSelection = (e, gas: GasLevel) => {
    if (disabled) return;
    return panelSelection(e, gas);
  };

  const externalPanelSelection = (e, gas: GasLevel) => {
    e.stopPropagation();
    const target = gas;

    if (gas.level === 'custom') {
      onChange({
        ...target,
        level: 'custom',
        price: Number(target.price),
        gasLimit: Number(afterGasLimit),
        nonce: Number(customNonce),
        maxPriorityFee: calcMaxPriorityFee(
          gasList,
          target,
          chainId,
          isCancel || isSpeedUp
        ),
      });
    } else {
      onChange({
        ...gas,
        gasLimit: Number(afterGasLimit),
        nonce: Number(customNonce),
        level: gas?.level,
        maxPriorityFee: calcMaxPriorityFee(
          gasList,
          target,
          chainId,
          isCancel || isSpeedUp
        ),
      });
    }
  };

  const externalHandleCustomGasChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    e.stopPropagation();

    if (INPUT_NUMBER_RE.test(e.target.value)) {
      const value = filterNumber(e.target.value);
      setCustomGas(value);

      const gasObj = {
        level: 'custom',
        front_tx_count: 0,
        estimated_seconds: 0,
        base_fee: gasList[0].base_fee,
        priority_price: 0,
      };

      const currentObj = {
        ...gasObj,
        ...rawSelectedGas,
        front_tx_count: 0,
        estimated_seconds: 0,
        base_fee: gasList[0].base_fee,
        price: Number(value) * 1e9,
        level: 'custom',
        gasLimit: Number(afterGasLimit),
        nonce: Number(customNonce),
        maxPriorityFee: Number(value) * 1e9,
      };
      onChange(currentObj);
    }
  };

  const customGasConfirm = (e) => {
    const gas = {
      level: 'custom',
      price: Number(e?.target?.value),
      front_tx_count: 0,
      estimated_seconds: 0,
      base_fee: gasList[0].base_fee,
      priority_price: null,
    };
    setSelectedGas({
      ...gas,
      price: Number(gas.price),
      level: gas.level,
    });
  };

  const handleMaxPriorityFeeChange = (val: number) => {
    setMaxPriorityFee(val);
  };

  const handleClickRule = (id: string) => {
    const rule = rules.find((item) => item.id === id);
    if (!rule) return;
    const result = engineResultMap[id];
    dispatch.securityEngine.openRuleDrawer({
      ruleConfig: rule,
      value: result?.value,
      level: result?.level,
      ignored: processedRules.includes(id),
    });
  };

  useDebounce(
    () => {
      (isReady || !isFirstTimeLoad) &&
        setSelectedGas((gas) => ({
          ...gas,
          level: 'custom',
          price: Number(customGas) * 1e9,
          front_tx_count: 0,
          estimated_seconds: 0,
          priority_price: null,
          base_fee: gasList[0].base_fee,
        }));
    },
    500,
    [customGas]
  );

  useEffect(() => {
    setGasLimit(Number(gasLimit));
  }, [gasLimit]);

  useEffect(() => {
    formValidator();
  }, [afterGasLimit, selectedGas, gasList, customNonce]);

  useEffect(() => {
    if (!rawSelectedGas) return;
    setSelectedGas(rawSelectedGas);
    if (rawSelectedGas?.level !== 'custom') return;
    setCustomGas((e) =>
      Number(e) * 1e9 === rawSelectedGas.price ? e : rawSelectedGas.price / 1e9
    );
  }, [rawSelectedGas]);

  useEffect(() => {
    setCustomNonce(Number(nonce));
  }, [nonce]);

  useEffect(() => {
    if (isReady && isFirstTimeLoad) {
      setIsFirstTimeLoad(false);
    }
  }, [isReady]);

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
    if (isReady && selectedGas && chainId === 1) {
      if (selectedGas.priority_price && selectedGas.priority_price !== null) {
        setMaxPriorityFee(selectedGas.priority_price / 1e9);
      } else {
        const priorityFee = calcMaxPriorityFee(
          gasList,
          selectedGas,
          chainId,
          isSpeedUp || isCancel
        );
        setMaxPriorityFee(priorityFee / 1e9);
      }
    } else if (selectedGas) {
      setMaxPriorityFee(selectedGas.price / 1e9);
    }
  }, [gasList, selectedGas, isReady, chainId]);

  if (!isReady && isFirstTimeLoad)
    return (
      <>
        <div className="gas-selector pt-[14px] pb-[16px]">
          <div>
            <div>
              <Skeleton.Input active style={{ width: 120, height: 18 }} />
            </div>
            <div className="flex items-center justify-between mt-12">
              {Array(4)
                .fill(0)
                .map((_e, i) => (
                  <Skeleton.Input
                    key={i}
                    active
                    style={{ width: 76, height: 52 }}
                  />
                ))}
            </div>
          </div>
        </div>
      </>
    );

  return (
    <>
      <div className="gas-selector">
        <div
          className={clsx(
            'gas-selector-card',
            gas.error || !gas.success ? 'items-start mb-12' : 'mb-12'
          )}
        >
          <div className="relative flex overflow-hidden">
            <div className="gas-selector-card-title">
              {t('page.signTx.gasSelectorTitle')}
            </div>
            <div className="gas-selector-card-content ml-4 overflow-hidden">
              {disabled ? (
                <div className="font-semibold">
                  {t('page.signTx.noGasRequired')}
                </div>
              ) : gas.error || !gas.success ? (
                <>
                  <div className="gas-selector-card-error">
                    {t('page.signTx.failToFetchGasCost')}
                  </div>
                </>
              ) : (
                <div className="gas-selector-card-content-item">
                  <div className="gas-selector-card-amount translate-y-1 flex items-center overflow-hidden">
                    <span className="text-r-blue-default font-medium text-15 truncate">
                      {formatTokenAmount(
                        new BigNumber(gas.gasCostAmount).toString(10),
                        8
                      )}{' '}
                      {chain.nativeTokenSymbol}
                    </span>
                    <span className="truncate">
                      &nbsp; ≈${new BigNumber(gas.gasCostUsd).toFixed(2)}
                    </span>
                    {L2_ENUMS.includes(chain.enum) &&
                      !CAN_ESTIMATE_L1_FEE_CHAINS.includes(chain.enum) && (
                        <span className="relative ml-6">
                          <TooltipWithMagnetArrow
                            title={t('page.signTx.l2GasEstimateTooltip')}
                            className="rectangle w-[max-content]"
                          >
                            <img
                              src={IconQuestionMark}
                              className="cursor-pointer w-14"
                            />
                          </TooltipWithMagnetArrow>
                        </span>
                      )}
                  </div>
                </div>
              )}
            </div>
            {engineResultMap['1118'] && (
              <SecurityLevelTagNoText
                enable={engineResultMap['1118'].enable}
                level={
                  processedRules.includes('1118')
                    ? 'proceed'
                    : engineResultMap['1118'].level
                }
                onClick={() => handleClickRule('1118')}
                right="-40px"
                className="security-level-tag"
              />
            )}
          </div>
          <div className="flex-1" />
          <div
            className="flex items-center text-12 text-r-neutral-foot cursor-pointer"
            role="button"
            onClick={handleClickEdit}
          >
            <span>{t('page.signTx.gasMoreButton')}</span>
            <IconArrowRight />
          </div>
        </div>
        <GasSelectPanel
          gasList={gasList}
          selectedGas={rawSelectedGas}
          panelSelection={externalPanelSelection}
          customGas={customGas}
          handleCustomGasChange={externalHandleCustomGasChange}
          disabled={disabled}
          chain={chain}
          nativeTokenBalance={nativeTokenBalance}
          gasPriceMedian={gasPriceMedian}
        />
        {manuallyChangeGasLimit && (
          <ManuallySetGasLimitAlert>
            {t('page.signTx.manuallySetGasLimitAlert')} {Number(gasLimit)}
          </ManuallySetGasLimitAlert>
        )}
        {errors.length > 0 && (
          <ErrorsWrapper>
            {errors.map((error) => (
              <div className="item" key={error.code}>
                <ThemeIcon
                  src={RcIconAlert}
                  className="icon icon-alert text-r-neutral-body"
                />
                <span className="flex-1">
                  {error.msg} #{error.code}
                </span>
              </div>
            ))}
          </ErrorsWrapper>
        )}
      </div>
      <Popup
        height={720}
        visible={modalVisible}
        title={t('page.signTx.gasSelectorTitle')}
        className="gas-modal"
        onCancel={() => setModalVisible(false)}
        destroyOnClose
        closable
        isSupportDarkMode
      >
        <div className="gas-selector-modal-top">
          {disabled ? (
            <div className="gas-selector-modal-amount">
              {t('page.signTx.noGasRequired')}
            </div>
          ) : gas.error || !gas.success ? (
            <>
              <div className="gas-selector-modal-error">
                {t('page.signTx.failToFetchGasCost')}
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
                {formatTokenAmount(
                  new BigNumber(modalExplainGas.gasCostAmount).toString(10),
                  6
                )}{' '}
                {chain.nativeTokenSymbol}
              </div>
              <div className="gas-selector-modal-usd">
                ≈${modalExplainGas.gasCostUsd.toFixed(2)}
              </div>
            </>
          )}
        </div>
        <div className="card-container">
          <div
            className={clsx('card-container-title', {
              disabled: disabled,
            })}
          >
            {t('page.signTx.gasPriceTitle')}
          </div>
          <Tooltip
            overlayClassName="rectangle"
            title={
              disabled ? t('page.signTx.gasNotRequireForSafeTransaction') : null
            }
          >
            <CardBody $disabled={disabled}>
              {gasList.map((item, idx) => (
                <div
                  key={`gas-item-${item.level}-${idx}`}
                  className={clsx('card', {
                    active: selectedGas?.level === item.level,
                  })}
                  onClick={(e) => handlePanelSelection(e, item)}
                >
                  <div className="gas-level">
                    {t(getGasLevelI18nKey(item.level))}
                  </div>
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
                        onClick={(e) => handlePanelSelection(e, item)}
                        onPressEnter={customGasConfirm}
                        ref={customerInputRef}
                        autoFocus={selectedGas?.level === item.level}
                        min={0}
                        bordered={false}
                        disabled={disabled}
                      />
                    ) : (
                      <Tooltip
                        title={new BigNumber(item.price / 1e9).toFixed()}
                        overlayClassName={clsx('rectangle')}
                      >
                        <div>
                          {new BigNumber(item.price / 1e9)
                            .toFixed()
                            .slice(0, 8)}
                        </div>
                      </Tooltip>
                    )}
                  </div>
                </div>
              ))}
            </CardBody>
          </Tooltip>
        </div>
        <div>
          {is1559 && (
            <div className="priority-slider">
              <p className="priority-slider-header">
                {t('page.signTx.maxPriorityFee')}
                <Tooltip
                  title={
                    <ol className="list-decimal list-outside pl-[12px] mb-0">
                      <li>{t('page.signTx.eip1559Desc1')}</li>
                      <li>{t('page.signTx.eip1559Desc2')}</li>
                    </ol>
                  }
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
                  step={0.01}
                />
                <p className="priority-slider__mark">
                  <span>0</span>
                  <span>{selectedGas ? selectedGas.price / 1e9 : 0}</span>
                </p>
              </div>
            </div>
          )}
          {isReal1559 && isHardware && (
            <div className="hardware-1559-tip">
              {t('page.signTx.hardwareSupport1559Alert')}
            </div>
          )}
          <Form onFinish={handleConfirmGas}>
            <div className="gas-limit">
              <p
                className={clsx('gas-limit-label flex leading-[16px]', {
                  disabled: disabled,
                })}
              >
                <span className="flex-1">{t('page.signTx.gasLimitTitle')}</span>
              </p>
              <div className="expanded gas-limit-panel-wrapper widget-has-ant-input">
                <Tooltip
                  overlayClassName="rectangle"
                  title={
                    disabled
                      ? t('page.signTx.gasNotRequireForSafeTransaction')
                      : null
                  }
                >
                  <Form.Item
                    className={clsx('gas-limit-panel mb-0', {
                      disabled: disabled,
                    })}
                    validateStatus={validateStatus.gasLimit.status}
                  >
                    <Input
                      className="popup-input"
                      value={afterGasLimit}
                      onChange={handleGasLimitChange}
                      disabled={disabled}
                    />
                  </Form.Item>
                </Tooltip>
                {validateStatus.gasLimit.message ? (
                  <p className="tip text-red-light not-italic">
                    {validateStatus.gasLimit.message}
                  </p>
                ) : (
                  <p className={clsx('tip', { disabled: disabled })}>
                    <Trans
                      i18nKey="page.signTx.recommendGasLimitTip"
                      values={{
                        est: Number(recommendGasLimit),
                        current: new BigNumber(afterGasLimit)
                          .div(recommendGasLimit)
                          .toFixed(1),
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
                  <p className="gas-limit-title mt-20 mb-0 leading-[16px]">
                    {t('page.signTx.nonceTitle')}
                  </p>
                  <Form.Item
                    className="gas-limit-panel mb-0"
                    required
                    validateStatus={validateStatus.nonce.status}
                  >
                    <Input
                      className="popup-input"
                      value={customNonce}
                      onChange={handleCustomNonceChange}
                      disabled={disableNonce}
                    />
                  </Form.Item>
                  {validateStatus.nonce.message ? (
                    <p className="tip text-red-light not-italic">
                      {validateStatus.nonce.message}
                    </p>
                  ) : (
                    <p className="tip">
                      {t('page.signTx.gasLimitModifyOnlyNecessaryAlert')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Form>
        </div>
        <div className="flex justify-center mt-32 popup-footer">
          <Button
            type="primary"
            className="w-[200px]"
            size="large"
            onClick={handleModalConfirmGas}
            disabled={!isReady || validateStatus.customGas.status === 'error'}
          >
            {t('global.confirm')}
          </Button>
        </div>
      </Popup>
    </>
  );
};

const GasPriceDesc = styled.ul`
  margin-top: 12px;
  margin-bottom: 0;
  font-size: 13px;
  color: var(--r-neutral-body, #3e495e);
  li {
    position: relative;
    margin-bottom: 8px;
    padding-left: 12px;
    &:nth-last-child(1) {
      margin-bottom: 0;
    }
    &::before {
      content: '';
      position: absolute;
      width: 4px;
      height: 4px;
      border-radius: 100%;
      background-color: var(--r-neutral-body, #3e495e);
      left: 0;
      top: 8px;
    }
  }
`;

const GasSelectPanel = ({
  gasList,
  selectedGas,
  panelSelection,
  customGas,
  customGasConfirm = () => null,
  handleCustomGasChange,
  disabled,
  chain,
  nativeTokenBalance,
  gasPriceMedian,
}: {
  gasList: GasLevel[];
  selectedGas: GasLevel | null;
  panelSelection: (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    item: GasLevel
  ) => void;
  customGas: string | number;
  customGasConfirm?: React.KeyboardEventHandler<HTMLInputElement> | undefined;
  handleCustomGasChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  chain: Chain;
  nativeTokenBalance: string;
  gasPriceMedian: number | null;
}) => {
  const { t } = useTranslation();
  const customerInputRef = useRef<Input>(null);
  const handlePanelSelection = (e, item) => {
    if (disabled) return;
    return panelSelection(e, item);
  };

  return (
    <Tooltip
      overlayClassName="rectangle"
      title={disabled ? t('page.signTx.gasNotRequireForSafeTransaction') : null}
    >
      <CardBody $disabled={disabled}>
        {gasList.map((item, idx) => (
          <div
            key={`gas-item-${item.level}-${idx}`}
            className={clsx('card', {
              active: selectedGas?.level === item.level,
            })}
            onClick={(e) => {
              handlePanelSelection(e, item);
              if (item.level === 'custom') {
                customerInputRef.current?.focus();
              }
            }}
          >
            <div className="gas-level">{t(getGasLevelI18nKey(item.level))}</div>
            <div
              className={clsx('cardTitle w-full', {
                'custom-input': item.level === 'custom',
                active: selectedGas?.level === item.level,
              })}
            >
              {item.level === 'custom' ? (
                <Input
                  value={customGas}
                  defaultValue={customGas}
                  onChange={handleCustomGasChange}
                  onClick={(e) => handlePanelSelection(e, item)}
                  onPressEnter={customGasConfirm}
                  ref={customerInputRef}
                  autoFocus={selectedGas?.level === item.level}
                  min={0}
                  bordered={false}
                  disabled={disabled}
                  placeholder="0"
                />
              ) : (
                <Tooltip
                  title={new BigNumber(item.price / 1e9).toFixed()}
                  overlayClassName={clsx('rectangle')}
                >
                  <div>
                    {new BigNumber(item.price / 1e9).toFixed().slice(0, 8)}
                  </div>
                </Tooltip>
              )}
            </div>
          </div>
        ))}
      </CardBody>
      <GasPriceDesc>
        <li>
          {t('page.signTx.myNativeTokenBalance', {
            symbol: chain.nativeTokenSymbol,
            amount: formatTokenAmount(
              new BigNumber(nativeTokenBalance).div(1e18).toFixed(),
              4,
              true
            ),
          })}
        </li>
        {gasPriceMedian !== null && (
          <li>
            {t('page.signTx.gasPriceMedian')}
            {new BigNumber(gasPriceMedian).div(1e9).toFixed()} Gwei
          </li>
        )}
      </GasPriceDesc>
    </Tooltip>
  );
};

export default GasSelector;
