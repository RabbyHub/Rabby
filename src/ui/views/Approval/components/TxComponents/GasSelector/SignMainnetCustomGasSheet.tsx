import { formatGasHeaderUsdValue, formatTokenAmount } from '@/ui/utils/number';
import { getGasLevelI18nKey } from '@/ui/utils/trans';
import { INPUT_NUMBER_RE, filterNumber } from '@/constant/regexp';
import { calcGasEstimated } from '@/utils/time';
import { getUiType, useWallet } from '@/ui/utils';
import { findChain } from '@/utils/chain';
import { Popup } from '@/ui/component';
import IconUnknown from '@/ui/assets/token-default.svg';
import { ReactComponent as IconInfoSVG } from '@/ui/assets/info-cc.svg';
import { ReactComponent as RcIconAlert } from 'ui/assets/sign/tx/alert-currentcolor.svg';
import { calcMaxPriorityFee } from '@/utils/transaction';
import { Divide } from '../../Divide';
import { Button, Input, InputRef, Skeleton, Tooltip } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import type { ComponentProps } from 'react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import {
  GasCardBody,
  GasPriceDesc,
  GasPriceBold,
  useExplainGas,
} from './gasCardStyles';

type GasSelectorHeaderProps = ComponentProps<
  typeof import('../GasSelectorHeader').default
>;

type SignMainnetCustomGasSheetBaseProps = Pick<
  GasSelectorHeaderProps,
  | 'tx'
  | 'gasLimit'
  | 'gas'
  | 'version'
  | 'chainId'
  | 'onChange'
  | 'isReady'
  | 'nonce'
  | 'gasList'
  | 'selectedGas'
  | 'is1559'
  | 'isHardware'
  | 'gasCalcMethod'
  | 'disabled'
  | 'nativeTokenBalance'
  | 'gasToken'
  | 'gasPriceMedian'
  | 'isCancel'
  | 'isSpeedUp'
  | 'getContainer'
>;

export interface SignMainnetCustomGasSheetProps
  extends SignMainnetCustomGasSheetBaseProps {
  visible: boolean;
  onClose(): void;
  selectedMaxPriorityFee?: number;
}

const CardBody = GasCardBody;

const formatMaxPriorityFeeInput = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return new BigNumber(value).toFixed();
};

const parseMaxPriorityFeeInput = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const toMaxPriorityFeeWei = (value?: string) => {
  if (!value) {
    return 0;
  }

  return new BigNumber(value)
    .times(1e9)
    .integerValue(BigNumber.ROUND_HALF_UP)
    .toNumber();
};

export const SignMainnetCustomGasSheet = ({
  visible,
  onClose,
  tx,
  gasLimit,
  gas,
  version,
  chainId,
  onChange,
  isReady,
  nonce,
  gasList,
  selectedGas: rawSelectedGas,
  selectedMaxPriorityFee,
  is1559,
  isHardware,
  gasCalcMethod,
  disabled,
  nativeTokenBalance,
  gasToken,
  gasPriceMedian,
  isCancel,
  isSpeedUp,
  getContainer,
}: SignMainnetCustomGasSheetProps) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const customerInputRef = useRef<InputRef>(null);
  const hasCustomPriorityFee = useRef(false);
  const chain = findChain({
    id: chainId,
  })!;
  const resolvedGasToken = useMemo(
    () =>
      gasToken || {
        tokenId: chain.nativeTokenAddress,
        symbol: chain.nativeTokenSymbol,
        decimals: chain.nativeTokenDecimals || 18,
        logoUrl: chain.nativeTokenLogo,
      },
    [chain, gasToken]
  );
  const uiType = useMemo(() => getUiType(), []);

  const [customGas, setCustomGas] = useState<string | number | undefined>();
  const [changedCustomGas, setChangedCustomGas] = useState(false);
  const [customGasEstimated, setCustomGasEstimated] = useState<number>(0);
  const [loadingGasEstimated, setLoadingGasEstimated] = useState(false);
  const [selectedGas, setSelectedGas] = useState<
    SignMainnetCustomGasSheetProps['selectedGas']
  >(rawSelectedGas);
  const [isSelectCustom, setIsSelectCustom] = useState(true);
  const resolvedSelectedMaxPriorityFee = useMemo(
    () =>
      rawSelectedGas
        ? (typeof selectedMaxPriorityFee === 'number'
            ? Math.min(selectedMaxPriorityFee, rawSelectedGas.price)
            : rawSelectedGas.priority_price === null
            ? rawSelectedGas.price
            : rawSelectedGas.priority_price) / 1e9
        : 0,
    [rawSelectedGas, selectedMaxPriorityFee]
  );
  const [maxPriorityFeeInput, setMaxPriorityFeeInput] = useState<
    string | undefined
  >(() => formatMaxPriorityFeeInput(resolvedSelectedMaxPriorityFee));
  const maxPriorityFee = useMemo(
    () => parseMaxPriorityFeeInput(maxPriorityFeeInput),
    [maxPriorityFeeInput]
  );
  const [isReal1559, setIsReal1559] = useState(false);
  const maxPriorityFeeWei = useMemo(
    () => toMaxPriorityFeeWei(maxPriorityFeeInput),
    [maxPriorityFeeInput]
  );

  const syncFromProps = useCallback(() => {
    hasCustomPriorityFee.current = false;
    setSelectedGas(rawSelectedGas);
    setIsSelectCustom(true);
    setLoadingGasEstimated(false);
    setMaxPriorityFeeInput(
      formatMaxPriorityFeeInput(resolvedSelectedMaxPriorityFee)
    );

    if (rawSelectedGas?.level === 'custom') {
      setCustomGas(rawSelectedGas.price / 1e9);
      setChangedCustomGas(true);
      setCustomGasEstimated(rawSelectedGas.estimated_seconds ?? 0);
      return;
    }

    setCustomGas(undefined);
    setChangedCustomGas(false);
    setCustomGasEstimated(
      gasList.find((item) => item.level === 'custom')?.estimated_seconds ?? 0
    );
  }, [gasList, rawSelectedGas, resolvedSelectedMaxPriorityFee]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    syncFromProps();

    const timer = window.setTimeout(
      () => {
        customerInputRef.current?.focus();
      },
      getContainer ? 200 : 50
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [getContainer, syncFromProps, visible]);

  const loadCustomGasData = useCallback(
    async (custom?: number) => {
      const list = await wallet.gasMarketV2({
        chain,
        customGas: custom && custom > 0 ? custom : undefined,
        tx,
      });

      return list.find((item) => item.level === 'custom') || null;
    },
    [chain, tx, wallet]
  );

  const modalExplainGas = useExplainGas({
    price: selectedGas?.price || 0,
    method: gasCalcMethod,
    value: {
      gasCostAmount: new BigNumber(gas.gasCostAmount),
      gasCostUsd: new BigNumber(gas.gasCostUsd),
    },
  });

  useEffect(() => {
    if (!is1559) {
      return;
    }

    if (selectedGas?.level === 'custom') {
      setIsReal1559(Number(customGas) !== maxPriorityFee);
      return;
    }

    if (selectedGas) {
      setIsReal1559(selectedGas.price / 1e9 !== maxPriorityFee);
    }
  }, [customGas, is1559, maxPriorityFee, selectedGas]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setLoadingGasEstimated(true);
  }, [customGas, visible]);

  useDebounce(
    () => {
      if (!visible || customGas === undefined || customGas === '') {
        setLoadingGasEstimated(false);
        return;
      }

      loadCustomGasData(Number(customGas) * 1e9).then((data) => {
        if (!data) {
          setLoadingGasEstimated(false);
          return;
        }

        setCustomGasEstimated(data.estimated_seconds ?? 0);
        const customTemplate =
          gasList.find((item) => item.level === 'custom') || data;
        setSelectedGas((prev) => ({
          ...(prev || customTemplate),
          level: 'custom',
          price: Number(customGas) * 1e9,
          front_tx_count: 0,
          estimated_seconds: data?.estimated_seconds ?? 0,
          priority_price: prev?.priority_price ?? null,
          base_fee: data?.base_fee ?? 0,
        }));
        setLoadingGasEstimated(false);
      });
    },
    200,
    [customGas, gasList, loadCustomGasData, visible]
  );

  const gasCostUsdStr = useMemo(() => {
    const bn = new BigNumber(modalExplainGas?.gasCostUsd);

    return formatGasHeaderUsdValue(bn.toString(10));
  }, [modalExplainGas?.gasCostUsd]);

  const gasCostAmountStr = useMemo(() => {
    return `${formatTokenAmount(
      new BigNumber(modalExplainGas.gasCostAmount).toString(10),
      6,
      true
    )} ${resolvedGasToken.symbol}`;
  }, [modalExplainGas?.gasCostAmount, resolvedGasToken.symbol]);

  const handleCustomGasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();

    if (INPUT_NUMBER_RE.test(e.target.value)) {
      setCustomGas(filterNumber(e.target.value));
      setChangedCustomGas(e.target.value !== '');
    }
  };

  const hiddenCustomGas = useMemo(() => {
    return customGas === '0' && !changedCustomGas;
  }, [changedCustomGas, customGas]);

  const panelSelection = (
    e: React.MouseEvent<HTMLDivElement>,
    nextGas: NonNullable<SignMainnetCustomGasSheetProps['selectedGas']>
  ) => {
    e.stopPropagation();
    setIsSelectCustom(nextGas.level === 'custom');

    if (nextGas.level === 'custom') {
      window.setTimeout(() => {
        customerInputRef.current?.focus();
      }, 50);

      if (!changedCustomGas) {
        return;
      }

      setSelectedGas({
        ...nextGas,
        level: 'custom',
        price: Number(customGas) * 1e9,
      });
      return;
    }

    setSelectedGas({
      ...nextGas,
      level: nextGas.level,
    });
  };

  const handleMaxPriorityFeeChange = (val: string) => {
    if (val !== '' && !INPUT_NUMBER_RE.test(val)) {
      return;
    }

    let priorityFeeMax = selectedGas ? selectedGas.price / 1e9 : 0;

    if (
      selectedGas?.level === 'custom' &&
      changedCustomGas &&
      customGas !== undefined
    ) {
      priorityFeeMax = Number(customGas);
    }

    if (val === '') {
      setMaxPriorityFeeInput(undefined);
      return;
    }

    const nextValue = filterNumber(val);
    const number = Number(nextValue);
    if (number < 0) {
      return;
    }
    if (number > priorityFeeMax) {
      setMaxPriorityFeeInput(formatMaxPriorityFeeInput(priorityFeeMax));
      return;
    }

    hasCustomPriorityFee.current = true;
    setMaxPriorityFeeInput(nextValue);
  };

  const isNilCustomGas = customGas === undefined || customGas === '';
  const notSelectCustomGasAndIsNil = !isSelectCustom && isNilCustomGas;
  const isLoadingGas = loadingGasEstimated || isNilCustomGas;
  const priorityFeeMax = useMemo(() => {
    if (
      selectedGas?.level === 'custom' &&
      changedCustomGas &&
      customGas !== undefined
    ) {
      return Number(customGas);
    }

    return selectedGas ? selectedGas.price / 1e9 : 0;
  }, [changedCustomGas, customGas, selectedGas]);

  useEffect(() => {
    if (!isReady || !selectedGas) {
      return;
    }

    if (isSelectCustom && isNilCustomGas && !hasCustomPriorityFee.current) {
      setMaxPriorityFeeInput(undefined);
      return;
    }

    let priorityPrice = calcMaxPriorityFee(
      gasList,
      selectedGas,
      chainId,
      isSpeedUp || isCancel
    );

    if (
      typeof selectedMaxPriorityFee === 'number' &&
      rawSelectedGas?.level === selectedGas.level &&
      rawSelectedGas.price === selectedGas.price
    ) {
      priorityPrice = Math.min(selectedMaxPriorityFee, selectedGas.price);
    }

    const nextMaxPriorityFee = priorityPrice / 1e9;

    if (!hasCustomPriorityFee.current || maxPriorityFee === undefined) {
      setMaxPriorityFeeInput(formatMaxPriorityFeeInput(nextMaxPriorityFee));
      return;
    }

    const clampedMaxPriorityFee =
      Math.min(selectedGas.price, maxPriorityFeeWei) / 1e9;

    if (clampedMaxPriorityFee !== maxPriorityFee) {
      setMaxPriorityFeeInput(formatMaxPriorityFeeInput(clampedMaxPriorityFee));
    }
  }, [
    chainId,
    gasList,
    isCancel,
    isNilCustomGas,
    isReady,
    isSelectCustom,
    isSpeedUp,
    maxPriorityFee,
    maxPriorityFeeWei,
    rawSelectedGas,
    selectedGas,
    selectedMaxPriorityFee,
  ]);

  const handleClose = useCallback(() => {
    syncFromProps();
    onClose();
  }, [onClose, syncFromProps]);

  const handleConfirm = useCallback(() => {
    if (!selectedGas) {
      return;
    }

    if (selectedGas.level === 'custom') {
      onChange({
        ...selectedGas,
        price: Number(customGas) * 1e9,
        gasLimit: Number(gasLimit),
        nonce: Number(nonce),
        level: selectedGas.level,
        maxPriorityFee: maxPriorityFeeWei,
      });
    } else {
      onChange({
        ...selectedGas,
        gasLimit: Number(gasLimit),
        nonce: Number(nonce),
        level: selectedGas.level,
        maxPriorityFee: maxPriorityFeeWei,
      });
    }

    handleClose();
  }, [
    customGas,
    gasLimit,
    handleClose,
    maxPriorityFeeWei,
    nonce,
    onChange,
    selectedGas,
  ]);

  if (!visible) {
    return null;
  }

  return (
    <Popup
      isNew
      height="auto"
      visible={visible}
      title={t('page.signTx.gasSelectorTitle')}
      className={clsx('gas-modal', uiType.isPop && 'is-popup')}
      onCancel={handleClose}
      destroyOnClose
      closable
      isSupportDarkMode
      getContainer={getContainer}
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
                src={
                  resolvedGasToken.logoUrl ||
                  chain.nativeTokenLogo ||
                  IconUnknown
                }
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
            disabled,
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
                key={`sign-mainnet-gas-item-${item.level}-${idx}`}
                className={clsx('card', {
                  active: isSelectCustom
                    ? item.level === 'custom'
                    : selectedGas?.level === item.level,
                })}
                onClick={(e) => panelSelection(e, item)}
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
                        onClick={(e) => panelSelection(e, item)}
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
                      overlayClassName="rectangle"
                    >
                      <div>
                        {new BigNumber(item.price / 1e9).toFixed().slice(0, 8)}
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
              new BigNumber(nativeTokenBalance)
                .div(new BigNumber(10).pow(resolvedGasToken.decimals || 18))
                .toFixed(),
              4,
              true
            )}{' '}
            {resolvedGasToken.symbol}
          </GasPriceBold>
        </div>
        {gasPriceMedian !== null ? (
          <div>
            {t('page.signTx.gasPriceMedian')}
            <GasPriceBold>
              {new BigNumber(gasPriceMedian).div(1e9).toFixed()} Gwei
            </GasPriceBold>
          </div>
        ) : null}
      </GasPriceDesc>

      <div>
        {is1559 ? (
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
                    value={maxPriorityFeeInput}
                    onChange={(e) => handleMaxPriorityFeeChange(e.target.value)}
                    prefixCls="priority-slider-input h-[52px]"
                    type="text"
                    inputMode="decimal"
                    disabled={isSelectCustom && isNilCustomGas}
                  />
                </div>
              </Tooltip>
            </div>
          </>
        ) : null}

        {isReal1559 && isHardware ? (
          <div className="hardware-1559-tip">
            {t('page.signTx.hardwareSupport1559Alert')}
          </div>
        ) : null}
      </div>

      <div className="flex justify-center mt-32 popup-footer">
        <Button
          type="primary"
          className="w-full mx-20"
          size="large"
          onClick={handleConfirm}
          disabled={
            !isReady ||
            (isSelectCustom && (isNilCustomGas || loadingGasEstimated)) ||
            maxPriorityFee === undefined
          }
        >
          {t('global.confirm')}
        </Button>
      </div>
    </Popup>
  );
};

export default SignMainnetCustomGasSheet;
