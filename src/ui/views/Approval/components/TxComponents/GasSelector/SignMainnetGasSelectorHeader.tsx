import { formatGasHeaderUsdValue } from '@/ui/utils/number';
import { getGasLevelI18nKey } from '@/ui/utils/trans';
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
  ...props
}: SignMainnetGasSelectorHeaderProps) => {
  const { t } = useTranslation();
  const [customVisible, setCustomVisible] = useState(false);
  const [showMoreOpen, setShowMoreOpen] = useState(false);
  const [autoOpenSignal, setAutoOpenSignal] = useState(0);
  const hasOpenedOnceRef = useRef(false);
  const noCustomRPCEnabled = noCustomRPC ?? true;

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
  const gasAccountUsable =
    gasAccountMethodSupported && !!gasAccountCost?.balance_is_enough;
  const [levelState, setLevelState] = useState<SignMainnetGasLevelState>({});
  const levelStateRef = useRef(levelState);
  const fetchContextIdRef = useRef(0);
  const levelRequestSeqRef = useRef(0);
  const activeLevelRequestsRef = useRef<
    Partial<
      Record<
        SignMainnetSupportedGasLevel,
        { contextId: number; requestId: number }
      >
    >
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

    const contextId = ++fetchContextIdRef.current;
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
      const activeRequest = activeLevelRequestsRef.current[gasLevel.level];
      const shouldFetchLevel = shouldFetchSignMainnetGasLevel({
        state: currentLevelState,
        needsNative,
        needsGasAccount,
        hasActiveRequest: activeRequest?.contextId === contextId,
      });

      if ((!needsNative && !needsGasAccount) || !shouldFetchLevel) {
        return;
      }

      const requestId = ++levelRequestSeqRef.current;
      activeLevelRequestsRef.current[gasLevel.level] = {
        contextId,
        requestId,
      };
      patchLevelState(gasLevel.level, { loading: true });

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
          const currentRequest = activeLevelRequestsRef.current[gasLevel.level];
          if (
            currentRequest?.contextId !== contextId ||
            currentRequest.requestId !== requestId
          ) {
            return;
          }
          patchLevelState(gasLevel.level, {
            ...nativePatch,
            ...gasAccountPatch,
          });
        })
        .catch(() => undefined)
        .finally(() => {
          const currentRequest = activeLevelRequestsRef.current[gasLevel.level];
          if (
            currentRequest?.contextId !== contextId ||
            currentRequest.requestId !== requestId
          ) {
            return;
          }
          delete activeLevelRequestsRef.current[gasLevel.level];
          patchLevelState(gasLevel.level, { loading: false });
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
  ]);

  const canOpenShowMore =
    !!props.isReady && !props.disabled && gas.success && !gas.error;
  const levelText = t(getGasLevelI18nKey(selectedGas?.level || 'normal'));
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

  const content = (
    <div className="flex items-center justify-between text-12 text-r-neutral-foot">
      <span className="inline-flex items-center gap-4">
        <span>Gas fee</span>
        {gasAccountInfoTooltip}
      </span>
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
  );

  return (
    <>
      {content}

      <SignMainnetCustomGasSheet
        {...props}
        gas={gas}
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
