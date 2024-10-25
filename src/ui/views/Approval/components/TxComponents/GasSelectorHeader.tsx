import { Button, Input, Skeleton, Tooltip } from 'antd';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { ValidateStatus } from 'antd/lib/form/FormItem';
import { GasLevel, TxPushType } from 'background/service/openapi';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import {
  MINIMUM_GAS_LIMIT,
  L2_ENUMS,
  CAN_ESTIMATE_L1_FEE_CHAINS,
} from 'consts';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import { ReactComponent as IconInfoSVG } from 'ui/assets/info-cc.svg';
import { Popup } from 'ui/component';
import { TooltipWithMagnetArrow } from 'ui/component/Tooltip/TooltipWithMagnetArrow';
import {
  formatGasCostUsd,
  formatTokenAmount,
  formatGasHeaderUsdValue,
} from '@/ui/utils/number';
import { calcMaxPriorityFee } from '@/utils/transaction';
import styled, { css } from 'styled-components';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import IconQuestionMark from 'ui/assets/sign/tx/question-mark.svg';
import { getGasLevelI18nKey } from '@/ui/utils/trans';
import { findChain } from '@/utils/chain';
import { INPUT_NUMBER_RE, filterNumber } from '@/constant/regexp';
import { ReactComponent as GasLogoSVG } from 'ui/assets/sign/tx/gas-logo-cc.svg';
import { ReactComponent as RcIconGasActive } from 'ui/assets/sign/tx/gas-active.svg';
import { ReactComponent as RcIconGasBlurCC } from 'ui/assets/sign/tx/gas-blur-cc.svg';

import { ReactComponent as RcIconGasAccountBlurCC } from 'ui/assets/sign/tx/gas-account-blur-cc.svg';
import { ReactComponent as RcIconGasAccountActive } from 'ui/assets/sign/tx/gas-account-active.svg';

import { GasMenuButton } from './GasMenuButton';
import { Divide } from '../Divide';
import { ReactComponent as RcIconAlert } from 'ui/assets/sign/tx/alert-currentcolor.svg';
import { calcGasEstimated } from '@/utils/time';
import { getUiType, useHover, useWallet } from '@/ui/utils';
import IconUnknown from '@/ui/assets/token-default.svg';
import { noop } from 'lodash';

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
  pushType?: TxPushType;
  gasMethod?: 'native' | 'gasAccount';
  onChangeGasMethod?(value: 'native' | 'gasAccount'): void;
  gasAccountCost?: {
    gas_account_cost: {
      total_cost: number;
      tx_cost: number;
      gas_cost: number;
      estimate_tx_cost: number;
    };
    is_gas_account: boolean;
    balance_is_enough: boolean;
    chain_not_support: boolean;
  };
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
              box-shadow: none;
            }
          }

          .cardTitle {
            &.active {
              color: var(--r-blue-default, #7084ff) !important;
            }
          }
        `}

  .card {
    width: 84px;
    height: 80px;
    border-radius: 8px;
    background: var(--r-neutral-card1, #fff);
    box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    border: 1px solid transparent;
    transition: all 0.2s;

    .gas-level,
    .cardTitle {
      text-align: center;
      font-size: 12px;
      line-height: 14px;
      color: var(--r-neutral-body, #3e495e);
      margin: 14px auto 0;
      font-weight: 500;
    }
    .cardTitle {
      color: var(--r-neutral-title-1, #192945) !important;
      font-weight: 500;
      font-size: 15px !important;
      line-height: 18px;
      margin: 6px auto 0;
      .ant-input {
        background: transparent !important;
      }
    }
    .cardTime {
      font-size: 12px;
      line-height: 14px;
      color: var(--r-neutral-foot, #6a7587);
      margin: 2px auto 0;
    }

    .custom-input {
      margin: 6px auto 0;

      .ant-input {
        padding: 0;
      }
    }
    .ant-input {
      text-align: center !important;
      font-size: 15px !important;
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

const HeaderStyled = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  height: 24px;
`;

const GasStyled = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  flex: 1;

  .gas-amount {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
`;

const GasPriceDesc = styled.div`
  margin-top: 20px;
  font-size: 13px;
  color: var(--r-neutral-body, #3e495e);
  display: flex;
  flex-direction: column;
  gap: 12px;
  line-height: 16px;
`;

const GasPriceBold = styled.span`
  font-weight: 500;
  color: var(--r-neutral-title1, #192945);
  font-size: 13px;
`;

const GasSelectorHeader = ({
  gasLimit,
  gas,
  chainId,
  onChange,
  isReady,
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
  engineResults = [],
  isCancel,
  isSpeedUp,
  nativeTokenBalance,
  gasPriceMedian,
  pushType,
  gasMethod,
  gasAccountCost,
  onChangeGasMethod,
}: GasSelectorProps) => {
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();
  const customerInputRef = useRef<Input>(null);
  const hasCustomPriorityFee = useRef(false);
  const [afterGasLimit, setGasLimit] = useState<string | number>(
    Number(gasLimit)
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [customGas, setCustomGas] = useState<string | number | undefined>();
  const [selectedGas, setSelectedGas] = useState<GasLevel | null>(
    rawSelectedGas
  );
  const [maxPriorityFee, setMaxPriorityFee] = useState<number | undefined>(
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
  const [customGasEstimated, setCustomGasEstimated] = useState<number>(0);

  const { rules, processedRules } = useRabbySelector((s) => ({
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
  }));

  const loadCustomGasData = useCallback(
    async (custom?: number): Promise<GasLevel> => {
      const list = await wallet.openapi.gasMarket(
        chain.serverId,
        custom && custom > 0 ? custom : undefined
      );
      return list.find((item) => item.level === 'custom')!;
    },
    []
  );

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

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
        maxPriorityFee: (maxPriorityFee ?? 0) * 1e9,
      });
    } else {
      onChange({
        ...selectedGas,
        gasLimit: Number(afterGasLimit),
        nonce: Number(customNonce),
        level: selectedGas.level,
        maxPriorityFee: (maxPriorityFee ?? 0) * 1e9,
      });
    }
  };

  const handleModalConfirmGas = () => {
    handleConfirmGas();
    setModalVisible(false);
  };

  const [changedCustomGas, setChangedCustomGas] = useState(false);

  const handleCustomGasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (INPUT_NUMBER_RE.test(e.target.value)) {
      setCustomGas(filterNumber(e.target.value));
      setChangedCustomGas(e.target.value === '' ? false : true);
    }
  };

  const hiddenCustomGas = useMemo(() => {
    return customGas === '0' && !changedCustomGas;
  }, [customGas, changedCustomGas]);

  const [isSelectCustom, setIsSelectCustom] = useState(false);
  const handleClickEdit = () => {
    setModalVisible(true);
    if (rawSelectedGas?.level !== 'custom') {
      setSelectedGas(rawSelectedGas);
      setGasLimit(Number(gasLimit));
      setCustomNonce(Number(nonce));
      setIsSelectCustom(true);
    }
    matomoRequestEvent({
      category: 'Transaction',
      action: 'EditGas',
      label: chain?.serverId,
    });
    setTimeout(() => {
      customerInputRef.current?.focus();
    }, 50);
  };

  const panelSelection = (e, gas: GasLevel) => {
    e.stopPropagation();
    const target = gas;

    // if (gas.level === selectedGas?.level) return;
    setIsSelectCustom(gas.level === 'custom');

    if (gas.level === 'custom') {
      setTimeout(() => {
        customerInputRef.current?.focus();
      }, 50);

      if (!changedCustomGas) {
        return;
      }

      setSelectedGas({
        ...target,
        level: 'custom',
        price: Number(customGas) * 1e9,
      });
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

  const externalPanelSelection = (gas: GasLevel) => {
    const target = gas;

    if (gas.level === 'custom') {
      if (!changedCustomGas) return;
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

  const customGasConfirm = (e) => {
    const customGas = gasList.find((item) => item.level === 'custom')!;
    const gas = {
      ...customGas,
      price: Number(e?.target?.value),
    };
    setSelectedGas({
      ...gas,
      price: Number(gas.price),
      level: gas.level,
    });
  };

  let priorityFeeMax = selectedGas ? selectedGas.price / 1e9 : 0;
  const handleMaxPriorityFeeChange = (val: any) => {
    if (
      selectedGas?.level === 'custom' &&
      changedCustomGas &&
      customGas !== undefined
    ) {
      priorityFeeMax = Number(customGas);
    }
    if (val === '') {
      setMaxPriorityFee(undefined);
      return;
    }
    const number = Number(val);
    if (number < 0) return;
    if (number > priorityFeeMax) {
      setMaxPriorityFee(priorityFeeMax);
      return;
    }
    hasCustomPriorityFee.current = true; // flag user has customized priorityFee
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
  const [loadingGasEstimated, setLoadingGasEstimated] = useState(false);

  // reset loading state when custom gas change
  useEffect(() => {
    setLoadingGasEstimated(true);
  }, [customGas]);

  useDebounce(
    () => {
      if (isReady || !isFirstTimeLoad) {
        if (customGas === undefined) return;
        loadCustomGasData(Number(customGas) * 1e9).then((data) => {
          if (data) setCustomGasEstimated(data.estimated_seconds);
          setSelectedGas((gas) => ({
            ...gas,
            level: 'custom',
            price: Number(customGas) * 1e9,
            front_tx_count: 0,
            estimated_seconds: data?.estimated_seconds ?? 0,
            priority_price: gas?.priority_price ?? null,
            base_fee: data?.base_fee ?? 0,
          }));
          setLoadingGasEstimated(false);
        });
      }
    },
    200,
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
    setChangedCustomGas(true);
    setLoadingGasEstimated(false);
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
    dispatch.securityEngine.init();
  }, []);

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

  const isNilCustomGas = customGas === undefined || customGas === '';
  const notSelectCustomGasAndIsNil = !isSelectCustom && isNilCustomGas;
  const isLoadingGas = loadingGasEstimated || isNilCustomGas;

  useEffect(() => {
    if (!isReady || !selectedGas) {
      return;
    }

    // reset maxPriorityFee when user select custom gas and not input
    if (isSelectCustom && isNilCustomGas && !hasCustomPriorityFee.current) {
      setMaxPriorityFee(undefined);
      return;
    }

    let priorityPrice = calcMaxPriorityFee(
      gasList,
      selectedGas,
      chainId,
      isSpeedUp || isCancel
    );

    setMaxPriorityFee((prevFee = priorityPrice / 1e9) => {
      // Compare with selectedGas.price to avoid customMaxPriorityFee is more than maxGasFee
      if (hasCustomPriorityFee.current) {
        priorityPrice = Math.min(selectedGas.price, prevFee * 1e9);
      }
      return priorityPrice / 1e9;
    });
  }, [gasList, selectedGas, isReady, chainId, isSelectCustom, isNilCustomGas]);

  useEffect(() => {
    const customGas = gasList.find((item) => item.level === 'custom');
    if (customGas) {
      setCustomGasEstimated(customGas.estimated_seconds);
    }
  }, [gasList]);

  const gasCostUsdStr = useMemo(() => {
    const bn = new BigNumber(modalExplainGas?.gasCostUsd);

    return formatGasHeaderUsdValue(bn.toString(10));
  }, [modalExplainGas?.gasCostUsd]);

  const gasCostAmountStr = useMemo(() => {
    return `${formatTokenAmount(
      new BigNumber(modalExplainGas.gasCostAmount).toString(10),
      6,
      true
    )} ${chain.nativeTokenSymbol}`;
  }, [modalExplainGas?.gasCostAmount]);

  const calcGasAccountUsd = useCallback((n: number | string) => {
    const v = Number(n);
    if (!Number.isNaN(v) && v < 0.0001) {
      return `$${n}`;
    }
    return formatGasHeaderUsdValue(n || '0');
  }, []);

  const [isGasHovering, gasHoverProps] = useHover();

  const [isGasAccountHovering, gasAccountHoverProps] = useHover();

  const handleClosePopup = () => {
    setCustomGas(undefined);
    setChangedCustomGas(false);
    setSelectedGas(rawSelectedGas);
    setModalVisible(false);
  };

  const uiType = useMemo(() => getUiType(), []);

  if (!isReady && isFirstTimeLoad) {
    return (
      <HeaderStyled>
        <Skeleton.Input className="rounded w-[130px] h-[20px]" active />
        <Skeleton.Input className="rounded w-[100px] h-[20px]" active />
      </HeaderStyled>
    );
  }

  if (disabled) {
    return null;
  }

  return (
    <>
      <HeaderStyled>
        <GasStyled {...gasHoverProps}>
          {gasMethod ? (
            <div
              className={clsx(
                'p-2 rounded-md flex items-center relative',
                'border-[0.5px] border-solid border-rabby-neutral-line'
              )}
            >
              <GasMethod
                active={gasMethod === 'native'}
                onChange={() => {
                  onChangeGasMethod?.('native');
                }}
                ActiveComponent={RcIconGasActive}
                BlurComponent={RcIconGasBlurCC}
                tips={t('page.signTx.nativeTokenForGas', {
                  tokenName: chain.nativeTokenSymbol,
                  chainName: chain.name,
                })}
              />

              <GasMethod
                active={gasMethod === 'gasAccount'}
                onChange={() => {
                  onChangeGasMethod?.('gasAccount');
                }}
                ActiveComponent={RcIconGasAccountActive}
                BlurComponent={RcIconGasAccountBlurCC}
                tips={t('page.signTx.gasAccountForGas')}
              />
            </div>
          ) : (
            <GasLogoSVG className="flex-shrink-0 text-r-neutral-foot" />
          )}
          <div className="ml-8 gas-selector-card-content">
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
            ) : gasMethod === 'gasAccount' ? (
              <div className="relative gas-selector-card-content-item">
                <div
                  className={clsx(
                    'gas-selector-card-amount translate-y-1 flex items-center'
                  )}
                  {...gasAccountHoverProps}
                >
                  <div className="truncate max-w-[170px] group text-r-neutral-body">
                    <span className="text-[16px] font-medium text-r-blue-default">
                      {formatGasHeaderUsdValue(
                        (gasAccountCost?.gas_account_cost.estimate_tx_cost ||
                          0) + (gasAccountCost?.gas_account_cost.gas_cost || 0)
                      )}
                    </span>
                    <span className="text-14 text-r-neutral-body font-normal pl-4">
                      ~
                      {calcGasAccountUsd(
                        (gasAccountCost?.gas_account_cost.estimate_tx_cost ||
                          0) + (gasAccountCost?.gas_account_cost.gas_cost || 0)
                      )?.replace('$', '')}{' '}
                      USD
                    </span>
                  </div>
                  <Tooltip
                    overlayClassName="rectangle"
                    visible={isGasAccountHovering}
                    title={
                      <>
                        <div>
                          {t('page.signTx.gasAccount.estimatedGas')}
                          {calcGasAccountUsd(
                            gasAccountCost?.gas_account_cost.estimate_tx_cost ||
                              0
                          )}
                        </div>
                        <div>
                          {t('page.signTx.gasAccount.maxGas')}
                          {calcGasAccountUsd(
                            gasAccountCost?.gas_account_cost.total_cost || '0'
                          )}
                        </div>
                        <div>
                          {t('page.signTx.gasAccount.sendGas')}
                          {calcGasAccountUsd(
                            gasAccountCost?.gas_account_cost.total_cost || '0'
                          )}
                        </div>
                        <div>
                          {t('page.signTx.gasAccount.gasCost')}
                          {calcGasAccountUsd(
                            gasAccountCost?.gas_account_cost.gas_cost || '0'
                          )}
                        </div>
                      </>
                    }
                  >
                    <IconInfoSVG className="ml-4 text-r-neutral-foot" />
                  </Tooltip>
                </div>
              </div>
            ) : (
              <div className="relative gas-selector-card-content-item">
                <div
                  className={clsx(
                    'gas-selector-card-amount translate-y-1 flex items-center',
                    {
                      'text-r-red-default':
                        !processedRules.includes('1118') &&
                        engineResultMap['1118']?.level === 'danger',
                      'text-r-orange-default':
                        !processedRules.includes('1118') &&
                        engineResultMap['1118']?.level === 'warning',
                    }
                  )}
                >
                  {gasMethod ? (
                    <div className="truncate max-w-[210px] group text-r-neutral-body">
                      <span className="text-[16px] font-medium text-r-blue-default">
                        {gasCostUsdStr}
                      </span>

                      <span className="text-14 text-r-neutral-body font-normal pl-4">{`~${gasCostAmountStr}`}</span>
                    </div>
                  ) : (
                    <span
                      className="truncate max-w-[110px]"
                      title={gasCostUsdStr}
                    >
                      {gasCostUsdStr}
                    </span>
                  )}
                  {L2_ENUMS.includes(chain.enum) &&
                    !CAN_ESTIMATE_L1_FEE_CHAINS.includes(chain.enum) && (
                      <span className="relative ml-6">
                        <TooltipWithMagnetArrow
                          inApproval
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
          {!gasMethod && gas.success ? (
            <div className="mt-2 flex-shrink-1 text-r-neutral-body text-14 gas-amount">
              {isGasHovering
                ? calcGasEstimated(selectedGas?.estimated_seconds)
                : `~${gasCostAmountStr}`}
            </div>
          ) : null}
          {engineResultMap['1118'] && (
            <SecurityLevelTagNoText
              enable={engineResultMap['1118'].enable}
              level={
                processedRules.includes('1118')
                  ? 'proceed'
                  : engineResultMap['1118'].level
              }
              onClick={() => handleClickRule('1118')}
              right="-46px"
              className="security-level-tag"
            />
          )}
        </GasStyled>
        <GasMenuButton
          gasList={gasList}
          selectedGas={selectedGas}
          onSelect={externalPanelSelection}
          onCustom={handleClickEdit}
          showCustomGasPrice={changedCustomGas}
        />
      </HeaderStyled>
      <Popup
        isNew
        height={'auto'}
        visible={modalVisible}
        title={t('page.signTx.gasSelectorTitle')}
        className={clsx('gas-modal', uiType.isPop && 'is-popup')}
        onCancel={handleClosePopup}
        destroyOnClose
        closable
        isSupportDarkMode
      >
        <div className="mb-20 -mt-4">
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
                <div className="gas-selector-modal-error-desc mt-[8px] flex items-center justify-center">
                  <RcIconAlert className="w-16 mr-6 text-r-neutral-body" />
                  {gas.error.msg}{' '}
                  <span className="number">#{gas.error.code}</span>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="gas-selector-modal-amount">{gasCostUsdStr}</div>
              <div className="gas-selector-modal-usd">
                <img
                  src={chain.nativeTokenLogo || IconUnknown}
                  className="w-16 h-16 rounded-full"
                />
                {gasCostAmountStr}
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
                    active: isSelectCustom
                      ? item.level === 'custom'
                      : selectedGas?.level === item.level,
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
                      notSelectCustomGasAndIsNil ? (
                        '-'
                      ) : (
                        <Input
                          value={hiddenCustomGas ? '' : customGas}
                          defaultValue={hiddenCustomGas ? '' : customGas}
                          onChange={handleCustomGasChange}
                          onClick={(e) => handlePanelSelection(e, item)}
                          // onPressEnter={customGasConfirm}
                          ref={customerInputRef}
                          autoFocus={selectedGas?.level === item.level}
                          min={0}
                          bordered={false}
                          disabled={disabled}
                        />
                      )
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
                  <div className="cardTime">
                    {item.level === 'custom' ? (
                      notSelectCustomGasAndIsNil ? null : isLoadingGas ? (
                        <Skeleton.Input
                          className="w-[44px] h-[12px] rounded"
                          active
                        />
                      ) : (
                        calcGasEstimated(customGasEstimated)
                      )
                    ) : (
                      calcGasEstimated(item.estimated_seconds)
                    )}
                  </div>
                </div>
              ))}
            </CardBody>
          </Tooltip>
        </div>

        <GasPriceDesc>
          <div>
            {t('page.signTx.myNativeTokenBalance')}
            <GasPriceBold>
              {formatTokenAmount(
                new BigNumber(nativeTokenBalance).div(1e18).toFixed(),
                4,
                true
              )}{' '}
              {chain.nativeTokenSymbol}
            </GasPriceBold>
          </div>
          {gasPriceMedian !== null && (
            <div>
              {t('page.signTx.gasPriceMedian')}
              <GasPriceBold>
                {new BigNumber(gasPriceMedian).div(1e9).toFixed()} Gwei
              </GasPriceBold>
            </div>
          )}
        </GasPriceDesc>

        <div>
          {is1559 && (
            <>
              <Divide className="my-20 bg-r-neutral-line" />

              <div
                className={clsx('priority-slider', {
                  'opacity-50': maxPriorityFee === undefined,
                })}
              >
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
                    <IconInfoSVG className="mt-2 ml-2 text-r-neutral-foot" />
                  </Tooltip>
                </p>
                <Tooltip
                  title={
                    isSelectCustom && isNilCustomGas
                      ? t('page.signTx.maxPriorityFeeDisabledAlert')
                      : undefined
                  }
                  overlayClassName="rectangle"
                >
                  <div className="priority-slider-body">
                    <Input
                      onFocus={(e) => e.target.select()}
                      value={maxPriorityFee}
                      onChange={(e) =>
                        handleMaxPriorityFeeChange(e.target.value)
                      }
                      prefixCls="priority-slider-input h-[52px]"
                      type="number"
                      min={0}
                      max={priorityFeeMax}
                      step={0.01}
                      disabled={isSelectCustom && isNilCustomGas}
                    />
                  </div>
                </Tooltip>
              </div>
            </>
          )}
          {isReal1559 && isHardware && (
            <div className="hardware-1559-tip">
              {t('page.signTx.hardwareSupport1559Alert')}
            </div>
          )}
        </div>

        <div className="flex justify-center mt-32 popup-footer">
          <Button
            type="primary"
            className="w-full mx-20"
            size="large"
            onClick={handleModalConfirmGas}
            disabled={
              !isReady ||
              validateStatus.customGas.status === 'error' ||
              maxPriorityFee === undefined
            }
          >
            {t('global.confirm')}
          </Button>
        </div>
      </Popup>
    </>
  );
};

const GasMethod = (props: {
  active: boolean;
  onChange: () => void;
  ActiveComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  BlurComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  tips?: React.ReactNode;
}) => {
  const { active, onChange, ActiveComponent, BlurComponent, tips } = props;
  return (
    <Tooltip
      overlayClassName="rectangle"
      title={tips}
      visible={tips ? undefined : false}
      placement="topLeft"
      align={{
        offset: [-4, 0],
      }}
    >
      <div
        className={clsx(
          'w-32 h-24 relative rounded',
          'flex items-center justify-center',
          'group cursor-pointer',
          active ? 'bg-r-blue-light1' : 'bg-transparent'
        )}
        onClick={onChange}
      >
        <ActiveComponent className={clsx(active ? '' : 'hidden')} />
        <BlurComponent
          className={clsx(
            active
              ? 'hidden'
              : 'text-r-neutral-foot group-hover:text-r-neutral-body'
          )}
        />
      </div>
    </Tooltip>
  );
};

export default GasSelectorHeader;
