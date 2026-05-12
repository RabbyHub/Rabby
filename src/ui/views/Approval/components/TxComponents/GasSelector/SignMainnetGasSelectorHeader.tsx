import { formatGasHeaderUsdValue, formatTokenAmount } from '@/ui/utils/number';
import { getGasLevelI18nKey } from '@/ui/utils/trans';
import { findChain } from '@/utils/chain';
import type { TempoFeeTokenOption } from '@/utils/tempo';
import { calcMaxPriorityFee } from '@/utils/transaction';
import { Skeleton } from 'antd';
import clsx from 'clsx';
import type { ComponentProps } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

import { buildDirectSignSummary, calcGasAccountUsd } from './directSignSummary';
import { SignMainnetCustomGasSheet } from './SignMainnetCustomGasSheet';
import { SignMainnetShowMoreGasModal } from './SignMainnetShowMoreGasModal';
import {
  isApprovalGasMethodNotEnough,
  resolveApprovalGasMethod,
} from './approvalGasDisplay';
import {
  resolveSignMainnetGasLevelFetchMode,
  resolveSignMainnetGasLevelFetchNeeds,
  resolveSignMainnetAutoDowngradeGasLevel,
  shouldAutoOpenSignMainnetGasModal,
  shouldFetchSignMainnetGasLevel,
} from './signMainnetGasLevelPrefetch';
import type {
  SignMainnetGasLevelState,
  SignMainnetSupportedGasLevel,
} from './signMainnetGasLevelPrefetch';
import { ReactComponent as GasLogoSVG } from 'ui/assets/sign/tx/gas-blur-cc.svg';
import { ReactComponent as RcIconGasActive } from 'ui/assets/sign/tx/gas-active.svg';
import { ReactComponent as RcIconGasBlurCC } from 'ui/assets/sign/tx/gas-blur-cc.svg';
import { ReactComponent as RcIconGasAccountBlurCC } from 'ui/assets/sign/tx/gas-account-blur-cc.svg';
import { ReactComponent as RcIconGasAccountActive } from 'ui/assets/sign/tx/gas-account-active.svg';
import { BigNumber } from 'bignumber.js';
import { MenuButtonStyled } from '../GasMenuButton';
import { GasMethod } from '../GasSelectorHeader';
import { ReactComponent as ArrowSVG } from '@/ui/assets/arrow-cc.svg';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import SecurityLevelTagNoText from 'ui/views/Approval/components/SecurityEngine/SecurityLevelTagNoText';

type GasSelectorHeaderProps = ComponentProps<
  typeof import('../GasSelectorHeader').default
>;

export interface SignMainnetGasSelectorHeaderProps
  extends GasSelectorHeaderProps {
  nativeTokenInsufficient?: boolean;
  freeGasAvailable?: boolean;
  noCustomRPC?: boolean;
  isWalletConnect?: boolean;
  selectedMaxPriorityFee?: number;
  onSignTx?: boolean;
  showTempoGasTokenSelector?: boolean;
  tempoGasTokenList?: TempoFeeTokenOption[];
  onSelectTempoGasToken?: (token: TempoFeeTokenOption) => void;
  tempoGasTokenLoading?: boolean;
  onAutoChangeGasMethod?: (value: 'native' | 'gasAccount') => void;
  disableAutoGasLevelSwitch?: boolean;
}

export const SignMainnetGasSelectorHeader = ({
  nativeTokenInsufficient,
  freeGasAvailable,
  noCustomRPC,
  isWalletConnect,
  gasMethod,
  gasAccountCost,
  gas,
  tx,
  gasList,
  selectedGas,
  chainId,
  gasLimit,
  nonce,
  onChange,
  isCancel,
  isSpeedUp,
  gasCalcMethod,
  checkGasLevelIsNotEnough,
  selectedMaxPriorityFee,
  showTempoGasTokenSelector = false,
  tempoGasTokenList = [],
  onSelectTempoGasToken,
  tempoGasTokenLoading = false,
  onAutoChangeGasMethod,
  disableAutoGasLevelSwitch = false,
  onSignTx,
  ...props
}: SignMainnetGasSelectorHeaderProps) => {
  const { t } = useTranslation();
  const [customVisible, setCustomVisible] = useState(false);
  const [showMoreOpen, setShowMoreOpen] = useState(false);
  const [autoOpenSignal, setAutoOpenSignal] = useState(0);
  const hasOpenedOnceRef = useRef(false);
  const noCustomRPCEnabled = noCustomRPC ?? true;
  const chain = useMemo(
    () =>
      findChain({
        id: chainId,
      })!,
    [chainId]
  );
  const resolvedGasToken = useMemo(
    () =>
      props.gasToken || {
        tokenId: chain.nativeTokenAddress,
        symbol: chain.nativeTokenSymbol,
        decimals: chain.nativeTokenDecimals || 18,
        logoUrl: chain.nativeTokenLogo,
      },
    [chain, props.gasToken]
  );

  const displayGasMethod = resolveApprovalGasMethod({
    nativeTokenInsufficient,
    gasAccountChainSupported:
      !!gasAccountCost && !gasAccountCost.chain_not_support,
    noCustomRPC: noCustomRPCEnabled,
    freeGasAvailable,
    legacyGasMethod: gasMethod,
    isWalletConnect: !!isWalletConnect,
  });

  const gasAccountMethodSupported = !isWalletConnect && noCustomRPCEnabled;

  const gasCostUsdStr = useMemo(
    () => formatGasHeaderUsdValue(String(gas.gasCostUsd || 0)),
    [gas.gasCostUsd]
  );

  const summary = useMemo(
    () =>
      buildDirectSignSummary({
        displayGasMethod,
        gasCostUsdStr,
        gasCostAmountStr: '',
        gasAccountCost: gasAccountCost?.gas_account_cost,
      }),
    [displayGasMethod, gasAccountCost?.gas_account_cost, gasCostUsdStr]
  );

  const isSummaryNotEnough = isApprovalGasMethodNotEnough({
    displayMethod: displayGasMethod,
    nativeTokenInsufficient,
    gasAccountBalanceEnough: gasAccountCost?.balance_is_enough,
  });

  const supportedLevels = useMemo(
    () =>
      gasList.filter(
        (gasLevel) =>
          gasLevel.level === 'slow' ||
          gasLevel.level === 'normal' ||
          gasLevel.level === 'fast'
      ) as Array<
        typeof gasList[number] & { level: SignMainnetSupportedGasLevel }
      >,
    [gasList]
  );

  const selectedSupportedLevel = supportedLevels.find(
    (gasLevel) => gasLevel.level === selectedGas?.level
  )?.level;
  const supportedGasLevelPrices = useMemo(
    () =>
      supportedLevels.map((gasLevel) => ({
        level: gasLevel.level,
        price: Number(gasLevel.price),
      })),
    [supportedLevels]
  );
  const txFingerprint = useMemo(
    () =>
      [
        chainId || 0,
        tx.chainId || 0,
        tx.from || '',
        tx.to || '',
        tx.value || '',
        tx.data || '',
        gasLimit || '',
        nonce || '',
        isCancel ? '1' : '0',
        isSpeedUp ? '1' : '0',
        supportedLevels
          .map(
            (gasLevel) =>
              `${gasLevel.level}:${gasLevel.price}:${gasLevel.priority_price}:${gasLevel.base_fee}:${gasLevel.front_tx_count}:${gasLevel.estimated_seconds}`
          )
          .join(';'),
      ].join('|'),
    [
      chainId,
      gasLimit,
      isCancel,
      isSpeedUp,
      nonce,
      supportedLevels,
      tx.chainId,
      tx.data,
      tx.from,
      tx.to,
      tx.value,
    ]
  );
  const gasAccountUsable =
    gasAccountMethodSupported && !!gasAccountCost?.balance_is_enough;
  const [levelState, setLevelState] = useState<SignMainnetGasLevelState>({});
  const levelStateRef = useRef(levelState);
  const autoDowngradeKeyRef = useRef('');
  const activeLevelRequestsRef = useRef<
    Partial<Record<SignMainnetSupportedGasLevel, string>>
  >({});

  useEffect(() => {
    levelStateRef.current = levelState;
  }, [levelState]);

  const fetchMode = resolveSignMainnetGasLevelFetchMode({
    isReady: props.isReady,
    isModalOpen: showMoreOpen,
    nativeTokenInsufficient: !!nativeTokenInsufficient,
    gasAccountUsable,
  });

  useEffect(() => {
    if (
      fetchMode === 'idle' ||
      !checkGasLevelIsNotEnough ||
      !supportedLevels.length
    ) {
      return;
    }

    const patchLevelState = (
      level: SignMainnetSupportedGasLevel,
      patch: Partial<
        NonNullable<SignMainnetGasLevelState[SignMainnetSupportedGasLevel]>
      >
    ) => {
      setLevelState((prev) => ({
        ...prev,
        [level]: {
          ...prev[level],
          ...patch,
        },
      }));
    };

    supportedLevels.forEach((gasLevel) => {
      const {
        needsNative,
        needsGasAccount,
      } = resolveSignMainnetGasLevelFetchNeeds({
        gasAccountChainSupported: gasAccountMethodSupported,
      });
      const currentLevelState = levelStateRef.current[gasLevel.level];
      const isStaleLevelState =
        currentLevelState?.fingerprint !== txFingerprint;
      const requestKey = `${gasLevel.level}:${txFingerprint}`;
      const activeRequestKey = activeLevelRequestsRef.current[gasLevel.level];
      const shouldFetchLevel = shouldFetchSignMainnetGasLevel({
        state: currentLevelState,
        requestFingerprint: txFingerprint,
        needsNative,
        needsGasAccount,
        hasActiveRequest: activeRequestKey === requestKey,
      });

      if ((!needsNative && !needsGasAccount) || !shouldFetchLevel) {
        return;
      }

      activeLevelRequestsRef.current[gasLevel.level] = requestKey;
      patchLevelState(gasLevel.level, {
        fingerprint: txFingerprint,
        loading: true,
        ...(isStaleLevelState
          ? {
              nativeUsd: undefined,
              nativeNotEnough: undefined,
              gasAccount: undefined,
            }
          : {}),
      });

      const gasChange = {
        ...gasLevel,
        gasLimit: Number(gasLimit),
        nonce: Number(nonce),
        level: gasLevel.level,
        maxPriorityFee: calcMaxPriorityFee(
          gasList,
          gasLevel,
          chainId || 0,
          !!(isCancel || isSpeedUp)
        ),
      };

      const nativeRequest = needsNative
        ? Promise.all([
            gasCalcMethod(gasLevel.price).then((res) => ({
              nativeUsd: formatGasHeaderUsdValue(res.gasCostUsd.toString(10)),
            })),
            checkGasLevelIsNotEnough(gasChange, 'native').then(
              ([notEnough]) => ({
                nativeNotEnough: notEnough,
              })
            ),
          ]).then(([usdPatch, nativePatch]) => ({
            ...usdPatch,
            ...nativePatch,
          }))
        : Promise.resolve({});

      const gasAccountRequest = needsGasAccount
        ? checkGasLevelIsNotEnough(gasChange, 'gasAccount').then(
            ([notEnough, usd, gasAccountResult]) => ({
              gasAccount: [notEnough, calcGasAccountUsd(Number(usd || 0))],
              gasAccountResult,
            })
          )
        : Promise.resolve({});

      Promise.allSettled([nativeRequest, gasAccountRequest])
        .then(([nativePatchResult, gasAccountPatchResult]) => {
          const currentRequestKey =
            activeLevelRequestsRef.current[gasLevel.level];
          if (currentRequestKey !== requestKey) {
            return;
          }

          const nativePatch =
            nativePatchResult.status === 'fulfilled'
              ? nativePatchResult.value
              : {};
          const gasAccountPatch =
            gasAccountPatchResult.status === 'fulfilled'
              ? gasAccountPatchResult.value
              : {};

          patchLevelState(gasLevel.level, {
            fingerprint: txFingerprint,
            ...nativePatch,
            ...gasAccountPatch,
          });
        })
        .finally(() => {
          const currentRequestKey =
            activeLevelRequestsRef.current[gasLevel.level];
          if (currentRequestKey !== requestKey) {
            return;
          }
          delete activeLevelRequestsRef.current[gasLevel.level];
          patchLevelState(gasLevel.level, {
            fingerprint: txFingerprint,
            loading: false,
          });
        });
    });
  }, [
    chainId,
    checkGasLevelIsNotEnough,
    fetchMode,
    gasAccountMethodSupported,
    gasCalcMethod,
    gasList,
    gasLimit,
    isCancel,
    isSpeedUp,
    nonce,
    supportedLevels,
    txFingerprint,
  ]);

  useEffect(() => {
    if (
      disableAutoGasLevelSwitch ||
      freeGasAvailable ||
      props.disabled ||
      !props.isReady ||
      fetchMode !== 'prefetch'
    ) {
      return;
    }

    const nextGasLevel = resolveSignMainnetAutoDowngradeGasLevel({
      selectedSupportedLevel,
      selectedGasPrice: Number(selectedGas?.price),
      supportedGasLevels: supportedGasLevelPrices,
      gasAccountChainSupported: gasAccountMethodSupported,
      levelState,
      requestFingerprint: txFingerprint,
    });

    if (!nextGasLevel) {
      return;
    }

    const gasLevel = supportedLevels.find(
      (item) => item.level === nextGasLevel.level
    );

    if (!gasLevel) {
      return;
    }

    const switchKey = [
      txFingerprint,
      selectedSupportedLevel || '',
      selectedGas?.level || '',
      selectedGas?.price || '',
      nextGasLevel.level,
      nextGasLevel.gasMethod,
    ].join('|');

    if (autoDowngradeKeyRef.current === switchKey) {
      return;
    }

    const changeGasMethod = onAutoChangeGasMethod || props.onChangeGasMethod;
    if (!changeGasMethod) {
      return;
    }

    autoDowngradeKeyRef.current = switchKey;
    void changeGasMethod(nextGasLevel.gasMethod);
    onChange({
      ...gasLevel,
      gasLimit: Number(gasLimit),
      nonce: Number(nonce),
      level: gasLevel.level,
      maxPriorityFee: calcMaxPriorityFee(
        gasList,
        gasLevel,
        chainId || 0,
        !!(isCancel || isSpeedUp)
      ),
    });
  }, [
    chainId,
    disableAutoGasLevelSwitch,
    fetchMode,
    freeGasAvailable,
    gasAccountMethodSupported,
    gasLimit,
    gasList,
    isCancel,
    isSpeedUp,
    levelState,
    nonce,
    onAutoChangeGasMethod,
    onChange,
    props.disabled,
    props.isReady,
    props.onChangeGasMethod,
    selectedGas?.level,
    selectedGas?.price,
    selectedSupportedLevel,
    supportedGasLevelPrices,
    supportedLevels,
    txFingerprint,
  ]);

  // useEffect(() => {
  //   if (
  //     showMoreOpen ||
  //     hasOpenedOnceRef.current ||
  //     !shouldAutoOpenSignMainnetGasModal({
  //       fetchMode,
  //       selectedSupportedLevel,
  //       nativeTokenInsufficient: !!nativeTokenInsufficient,
  //       gasAccountUsable,
  //       gasAccountChainSupported: gasAccountMethodSupported,
  //       levelState,
  //       requestFingerprint: txFingerprint,
  //     })
  //   ) {
  //     return;
  //   }

  //   hasOpenedOnceRef.current = true;
  //   setAutoOpenSignal((signal) => signal + 1);
  // }, [
  //   fetchMode,
  //   gasAccountMethodSupported,
  //   gasAccountUsable,
  //   levelState,
  //   nativeTokenInsufficient,
  //   selectedSupportedLevel,
  //   showMoreOpen,
  //   txFingerprint,
  // ]);

  const canOpenShowMore =
    !!props.isReady && !props.disabled && gas.success && !gas.error;
  const levelText = t(getGasLevelI18nKey(selectedGas?.level || 'normal'));
  const gasAccountInfoTooltip =
    displayGasMethod === 'gasAccount' ? (
      <TooltipWithMagnetArrow
        placement="top"
        className="rectangle w-[max-content]"
        title={
          <div onClick={(e) => e.stopPropagation()}>
            <div>{t('page.signTx.gasAccount.description')}</div>
            <div>
              {t('page.signTx.gasAccount.estimatedGas')}{' '}
              {calcGasAccountUsd(
                gasAccountCost?.gas_account_cost.estimate_tx_cost || 0
              )}
            </div>
            <div>
              {t('page.signTx.gasAccount.maxGas')}{' '}
              {calcGasAccountUsd(
                gasAccountCost?.gas_account_cost.total_cost || '0'
              )}
            </div>
            <div>
              {t('page.signTx.gasAccount.gasCost')}{' '}
              {calcGasAccountUsd(
                gasAccountCost?.gas_account_cost.gas_cost || '0'
              )}
            </div>
          </div>
        }
      >
        <span className="inline-flex items-center leading-none">
          <RcIconInfo
            className="text-r-neutral-foot"
            onClick={(e) => e.stopPropagation()}
          />
        </span>
      </TooltipWithMagnetArrow>
    ) : null;
  const gasMethodQuickSwitch =
    gasMethod && props.onChangeGasMethod && !props.disabled ? (
      <div
        className={clsx(
          'p-2 rounded-md flex items-center relative flex-shrink-0 mr-8',
          'border-[0.5px] border-solid border-rabby-neutral-line'
        )}
      >
        <GasMethod
          active={displayGasMethod === 'native'}
          onChange={(e) => {
            e.stopPropagation();
            props.onChangeGasMethod?.('native');
          }}
          ActiveComponent={RcIconGasActive}
          BlurComponent={RcIconGasBlurCC}
          tips={t('page.signTx.nativeTokenForGas', {
            tokenName: resolvedGasToken.symbol,
            chainName: chain.name,
          })}
        />

        <GasMethod
          active={displayGasMethod === 'gasAccount'}
          onChange={(e) => {
            e.stopPropagation();
            if (!noCustomRPCEnabled) {
              return;
            }
            props.onChangeGasMethod?.('gasAccount');
          }}
          ActiveComponent={RcIconGasAccountActive}
          BlurComponent={RcIconGasAccountBlurCC}
          tips={
            noCustomRPCEnabled
              ? t('page.signTx.gasAccountForGas')
              : t('page.signTx.BroadcastMode.tips.customRPC')
          }
        />
      </div>
    ) : (
      <GasLogoSVG className="flex-shrink-0 text-r-neutral-foot mr-8" />
    );

  const gasCostAmountStr = useMemo(() => {
    return `${formatTokenAmount(
      new BigNumber(gas.gasCostAmount).toString(10),
      6,
      true
    )} ${resolvedGasToken.symbol}`;
  }, [gas.gasCostAmount, resolvedGasToken.symbol]);

  const securityResult = useMemo(
    () => props.engineResults?.find((item) => item.id === '1118'),
    [props.engineResults]
  );

  const { rules, processedRules } = useRabbySelector((s) => ({
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
  }));
  const dispatch = useRabbyDispatch();

  const handleClickRule = (id: string) => {
    const rule = rules.find((item) => item.id === id);
    if (!rule) return;

    dispatch.securityEngine.openRuleDrawer({
      ruleConfig: rule,
      value: securityResult?.value,
      level: securityResult?.level,
      ignored: processedRules.includes(id),
    });
  };
  const initEngineResultsRef = React.useRef(false);

  useEffect(() => {
    if (props.engineResults && !initEngineResultsRef.current) {
      initEngineResultsRef.current = true;
      dispatch.securityEngine.init();
    }
  }, [dispatch, props.engineResults]);

  const summaryNode = (
    <div
      className={clsx(
        'text-12 font-medium flex items-center gap-4',
        canOpenShowMore && 'cursor-pointer',
        isSummaryNotEnough ? 'text-r-red-default' : 'text-r-blue-default'
      )}
      onClick={() => {
        if (canOpenShowMore) {
          setShowMoreOpen(true);
        }
      }}
    >
      {!props.isReady ? (
        <Skeleton.Input
          active
          className="rounded"
          style={{
            width: 84,
            height: 16,
          }}
        />
      ) : gas.error || !gas.success ? (
        <span>{t('page.signTx.failToFetchGasCost')}</span>
      ) : (
        <span>{`${levelText} · ${summary.primaryText}`}</span>
      )}
    </div>
  );

  const summaryNodeOnSignTx = (
    <div className={clsx('text-14 font-medium flex items-center gap-4')}>
      {!props.isReady ? (
        <Skeleton.Input
          active
          className="rounded"
          style={{
            width: 84,
            height: 16,
          }}
        />
      ) : gas.error || !gas.success ? (
        <span>{t('page.signTx.failToFetchGasCost')}</span>
      ) : (
        // <span>{`${levelText} · ${summary.primaryText}`}</span>
        <>
          {gasMethodQuickSwitch}
          <div className="truncate max-w-[200px]">
            <span
              className={clsx(
                'text-[16px] font-medium',
                isSummaryNotEnough
                  ? 'text-r-red-default'
                  : 'text-r-blue-default'
              )}
            >
              {summary.primaryText}{' '}
            </span>
            {displayGasMethod === 'gasAccount' ? (
              <span>
                ~
                {calcGasAccountUsd(
                  (gasAccountCost?.gas_account_cost.estimate_tx_cost || 0) +
                    (gasAccountCost?.gas_account_cost.gas_cost || 0)
                )?.replace('$', '')}{' '}
                USD
              </span>
            ) : (
              <span>~{gasCostAmountStr}</span>
            )}
          </div>
          {securityResult && (
            <SecurityLevelTagNoText
              enable={true}
              level={securityResult.level}
              onClick={() => handleClickRule('1118')}
              right="-46px"
              className="security-level-tag"
            />
          )}
        </>
      )}
    </div>
  );

  const rightNode = !props.isReady ? (
    <Skeleton.Input
      active
      className="rounded"
      style={{
        width: 60,
        height: 16,
      }}
    />
  ) : (
    <MenuButtonStyled
      className={clsx(canOpenShowMore && 'cursor-pointer')}
      onClick={() => {
        if (canOpenShowMore) {
          setShowMoreOpen(true);
        }
      }}
    >
      <span>{levelText}</span>
      <ArrowSVG className="text-r-neutral-foot ml-2" />
    </MenuButtonStyled>
  );

  const content = (
    <div className="flex items-center justify-between text-12 text-r-neutral-foot relative">
      <span className="relative inline-flex items-center gap-4">
        {onSignTx ? (
          summaryNodeOnSignTx
        ) : (
          <span>{t('page.gasAccount.gasFee')}</span>
        )}
        {gasAccountInfoTooltip}
      </span>
      <div className="flex items-center gap-8">
        {canOpenShowMore ? (
          <SignMainnetShowMoreGasModal
            visible={showMoreOpen}
            onVisibleChange={(open) => {
              setShowMoreOpen(open);
              if (open) {
                hasOpenedOnceRef.current = true;
              }
            }}
            gasList={gasList}
            selectedGas={selectedGas}
            gasMethod={gasMethod}
            onChangeGasMethod={props.onChangeGasMethod}
            noCustomRPC={noCustomRPCEnabled}
            freeGasAvailable={freeGasAvailable}
            chainId={chainId}
            gasLimit={gasLimit || '0'}
            nonce={nonce}
            onChange={onChange}
            isCancel={isCancel}
            isSpeedUp={isSpeedUp}
            selectedGasCostUsdStr={gasCostUsdStr}
            gasAccountCost={gasAccountCost}
            nativeTokenInsufficient={nativeTokenInsufficient}
            isWalletConnect={isWalletConnect}
            autoOpenSignal={autoOpenSignal}
            levelState={levelState}
            showTempoGasTokenSelector={showTempoGasTokenSelector}
            selectedGasToken={resolvedGasToken}
            tempoGasTokenList={tempoGasTokenList}
            onSelectTempoGasToken={onSelectTempoGasToken}
            tempoGasTokenLoading={tempoGasTokenLoading}
            getContainer={props.getContainer}
            onEditCustomGas={() => {
              setShowMoreOpen(false);
              setCustomVisible(true);
            }}
          >
            {onSignTx ? rightNode : summaryNode}
          </SignMainnetShowMoreGasModal>
        ) : (
          <>{onSignTx ? rightNode : summaryNode}</>
        )}
      </div>
    </div>
  );

  return (
    <>
      {content}

      <SignMainnetCustomGasSheet
        version={props.version}
        isReady={props.isReady}
        is1559={props.is1559}
        isHardware={props.isHardware}
        disabled={props.disabled}
        nativeTokenBalance={props.nativeTokenBalance}
        gasToken={props.gasToken}
        gasPriceMedian={props.gasPriceMedian}
        getContainer={props.getContainer}
        gas={gas}
        tx={tx}
        gasList={gasList}
        selectedGas={selectedGas}
        selectedMaxPriorityFee={selectedMaxPriorityFee}
        chainId={chainId}
        gasLimit={gasLimit}
        nonce={nonce}
        onChange={onChange}
        isCancel={isCancel}
        isSpeedUp={isSpeedUp}
        gasCalcMethod={gasCalcMethod}
        visible={customVisible}
        onClose={() => setCustomVisible(false)}
      />
    </>
  );
};

export default SignMainnetGasSelectorHeader;
