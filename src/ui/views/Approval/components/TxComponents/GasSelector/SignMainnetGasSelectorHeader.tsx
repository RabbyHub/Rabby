import { formatGasHeaderUsdValue } from '@/ui/utils/number';
import { getGasLevelI18nKey } from '@/ui/utils/trans';
import { findChain } from '@/utils/chain';
import { calcMaxPriorityFee } from '@/utils/transaction';
import { Tooltip, Skeleton } from 'antd';
import clsx from 'clsx';
import type { ComponentProps } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';

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
  shouldAutoOpenSignMainnetGasModal,
  shouldFetchSignMainnetGasLevel,
} from './signMainnetGasLevelPrefetch';
import type {
  SignMainnetGasLevelState,
  SignMainnetSupportedGasLevel,
} from './signMainnetGasLevelPrefetch';

type GasSelectorHeaderProps = ComponentProps<
  typeof import('../GasSelectorHeader').default
>;

export interface SignMainnetGasSelectorHeaderProps
  extends GasSelectorHeaderProps {
  nativeTokenInsufficient?: boolean;
  freeGasAvailable?: boolean;
  noCustomRPC?: boolean;
}

export const SignMainnetGasSelectorHeader = ({
  nativeTokenInsufficient,
  freeGasAvailable,
  noCustomRPC,
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
  showTempoGasTokenSelector = false,
  tempoGasTokenList = [],
  onSelectTempoGasToken,
  tempoGasTokenLoading = false,
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
  });
  const gasAccountChainSupported =
    !!gasAccountCost && !gasAccountCost.chain_not_support;
  const gasAccountMethodSupported =
    gasAccountChainSupported && noCustomRPCEnabled;

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
  const txFingerprint = useMemo(
    () =>
      [
        chainId || 0,
        tx.chainId || 0,
        tx.from || '',
        tx.to || '',
        tx.value || '',
        tx.data || '',
        tx.gas || '',
        tx.gasPrice || '',
        tx.maxFeePerGas || '',
        tx.maxPriorityFeePerGas || '',
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
      tx.gas,
      tx.gasPrice,
      tx.maxFeePerGas,
      tx.maxPriorityFeePerGas,
      tx.to,
      tx.value,
    ]
  );
  const gasAccountUsable =
    gasAccountMethodSupported && !!gasAccountCost?.balance_is_enough;
  const [levelState, setLevelState] = useState<SignMainnetGasLevelState>({});
  const levelStateRef = useRef(levelState);
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

      Promise.all([
        needsNative
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
          : Promise.resolve({}),
        needsGasAccount
          ? checkGasLevelIsNotEnough(gasChange, 'gasAccount').then(
              ([notEnough, usd]) => ({
                gasAccount: [
                  notEnough,
                  calcGasAccountUsd(Number(usd || 0)),
                ] as [boolean, string],
              })
            )
          : Promise.resolve({}),
      ])
        .then(([nativePatch, gasAccountPatch]) => {
          const currentRequestKey =
            activeLevelRequestsRef.current[gasLevel.level];
          if (currentRequestKey !== requestKey) {
            return;
          }
          patchLevelState(gasLevel.level, {
            fingerprint: txFingerprint,
            ...nativePatch,
            ...gasAccountPatch,
          });
        })
        .catch(() => undefined)
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
      showMoreOpen ||
      hasOpenedOnceRef.current ||
      !shouldAutoOpenSignMainnetGasModal({
        fetchMode,
        selectedSupportedLevel,
        nativeTokenInsufficient: !!nativeTokenInsufficient,
        gasAccountUsable,
        gasAccountChainSupported: gasAccountMethodSupported,
        levelState,
        requestFingerprint: txFingerprint,
      })
    ) {
      return;
    }

    hasOpenedOnceRef.current = true;
    setAutoOpenSignal((signal) => signal + 1);
  }, [
    fetchMode,
    gasAccountMethodSupported,
    gasAccountUsable,
    levelState,
    nativeTokenInsufficient,
    selectedSupportedLevel,
    showMoreOpen,
    txFingerprint,
  ]);

  const canOpenShowMore = !props.disabled;
  const levelText = t(getGasLevelI18nKey(selectedGas?.level || 'normal'));
  const handleOpenShowMore = () => {
    if (canOpenShowMore) {
      setShowMoreOpen(true);
    }
  };
  const gasAccountInfoTooltip =
    displayGasMethod === 'gasAccount' ? (
      <Tooltip
        align={{
          offset: [-10, 0],
        }}
        placement="topLeft"
        overlayClassName="rectangle w-[max-content]"
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
      </Tooltip>
    ) : null;

  const summaryNode = (
    <div
      className={clsx(
        'text-12 font-medium flex items-center gap-4',
        canOpenShowMore && 'cursor-pointer',
        isSummaryNotEnough ? 'text-r-red-default' : 'text-r-blue-default'
      )}
      onClick={handleOpenShowMore}
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

  const content = (
    <div className="flex items-center justify-between text-12 text-r-neutral-foot">
      <span className="inline-flex items-center gap-4">
        <span>Gas fee</span>
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
            {summaryNode}
          </SignMainnetShowMoreGasModal>
        ) : (
          summaryNode
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
