import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, message } from 'antd';
import { isSameAddress } from '@/ui/utils';
import { useWallet } from '@/ui/utils/WalletContext';
import { useSceneAccount } from '@/ui/hooks/backgroundState/useAccount';
import { DisplayPoolReserveInfo, UserSummary } from '../../types';
import { API_ETH_MOCK_ADDRESS } from '../../utils/constant';
import { calculateHFAfterToggleCollateral } from '../../utils/hfUtils';
import { collateralSwitchTx, optimizedPath } from '../../utils/poolService';
import { HF_RISK_CHECKBOX_THRESHOLD } from '../../utils/constant';
import { ToggleCollateralOverView } from './ToggleCollateralOverView';
import { useLendingSummary } from '../../hooks';
import { useSelectedMarket } from '../../hooks/market';
import { usePoolDataProviderContract } from '../../hooks/pool';

import { useCollateralWaring } from '../../hooks/useCollateralWaring';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { DirectSignToConfirmBtn } from '@/ui/component/ToConfirmButton';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { DirectSignGasInfo } from '@/ui/views/Bridge/Component/BridgeShowMore';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { ReserveDataHumanized } from '@aave/contract-helpers';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { StyledCheckbox } from '../BorrowModal';

type ToggleCollateralModalProps = {
  visible: boolean;
  onCancel: () => void;
  reserve: DisplayPoolReserveInfo;
  userSummary: UserSummary | null;
};

export const ToggleCollateralModal: React.FC<ToggleCollateralModalProps> = ({
  visible,
  onCancel,
  reserve,
  userSummary,
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [currentAccount] = useSceneAccount({
    scene: 'lending',
  });
  const {
    formattedPoolReservesAndIncentives,
    wrapperPoolReserve,
    iUserSummary: contextUserSummary,
  } = useLendingSummary();
  const { selectedMarketData, chainInfo, chainEnum } = useSelectedMarket();
  const { pools } = usePoolDataProviderContract();

  const { getContainer } = usePopupContainer();

  const summary = useMemo(() => userSummary ?? contextUserSummary, [
    userSummary,
    contextUserSummary,
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [miniSignLoading, setMiniSignLoading] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [isChecked, setIsChecked] = useState(false);

  const isNativeToken = useMemo(
    () => isSameAddress(reserve.underlyingAsset, API_ETH_MOCK_ADDRESS),
    [reserve.underlyingAsset]
  );

  const targetPool = useMemo(() => {
    if (!formattedPoolReservesAndIncentives?.length) return undefined;
    if (isNativeToken && chainEnum) {
      return wrapperPoolReserve ?? undefined;
    }
    return formattedPoolReservesAndIncentives.find((item) =>
      isSameAddress(item.underlyingAsset, reserve.underlyingAsset)
    );
  }, [
    formattedPoolReservesAndIncentives,
    reserve.underlyingAsset,
    isNativeToken,
    chainEnum,
    wrapperPoolReserve,
  ]);

  const poolReserveForWaring = useMemo(() => {
    return targetPool ?? undefined;
  }, [targetPool]);

  const afterHF = useMemo(() => {
    if (!reserve || !summary) return undefined;
    return calculateHFAfterToggleCollateral(summary, reserve).toString(10);
  }, [summary, reserve]);

  const { isError, errorMessage } = useCollateralWaring({
    afterHF,
    userReserve: reserve,
    poolReserve: poolReserveForWaring as ReserveDataHumanized | undefined,
  });

  const isRisky = useMemo(() => {
    if (!afterHF || Number(afterHF) < 0) return false;
    return Number(afterHF) < HF_RISK_CHECKBOX_THRESHOLD;
  }, [afterHF]);

  const isRiskToLiquidation = useMemo(() => {
    if (!afterHF || Number(afterHF) < 0) return false;
    return Number(afterHF) <= 1;
  }, [afterHF]);

  const showRisk = useMemo(() => isRisky && !isRiskToLiquidation, [
    isRisky,
    isRiskToLiquidation,
  ]);

  const canShowDirectSubmit = useMemo(
    () =>
      !!currentAccount &&
      !!chainInfo &&
      !chainInfo.isTestnet &&
      supportedDirectSign(currentAccount.type || ''),
    [currentAccount, chainInfo]
  );

  const { openDirect, prefetch, close: closeSign } = useMiniSigner({
    account: currentAccount!,
    chainServerId: chainInfo?.serverId || '',
    autoResetGasStoreOnChainChange: true,
  });

  const buildTx = useCallback(async () => {
    if (
      !reserve ||
      !currentAccount ||
      !pools ||
      !chainInfo ||
      isRiskToLiquidation ||
      isError ||
      !visible
    ) {
      setTxs([]);
      return;
    }
    const reserveAddress = isNativeToken
      ? wrapperPoolReserve?.underlyingAsset
      : reserve.underlyingAsset;
    if (!reserveAddress) {
      setTxs([]);
      return;
    }
    try {
      const collateralSwitchResult = await collateralSwitchTx({
        pool: pools.pool,
        address: currentAccount.address,
        reserve: reserveAddress,
        usageAsCollateral: !reserve.usageAsCollateralEnabledOnUser,
        useOptimizedPath: optimizedPath(selectedMarketData?.chainId),
      });
      const txItems = Array.isArray(collateralSwitchResult)
        ? collateralSwitchResult
        : [collateralSwitchResult];
      const resolved = await Promise.all(
        txItems.map((item: { tx: () => Promise<Record<string, unknown>> }) =>
          item.tx()
        )
      );
      const formatTxs: Tx[] = resolved.map((txData) => {
        const txObj = txData as {
          to?: string;
          data?: string;
          value?: { toHexString?: () => string } | string;
          from?: string;
          gasLimit?: number;
        };
        delete (txObj as Record<string, unknown>).gasLimit;
        return {
          ...txObj,
          from: txObj.from || currentAccount.address,
          value:
            typeof txObj.value === 'object' && txObj.value?.toHexString
              ? txObj.value.toHexString()
              : (txObj.value as string) || '0x0',
          chainId: chainInfo.id,
        } as Tx;
      });
      setTxs(formatTxs);
    } catch (error) {
      console.error('Toggle collateral build tx error:', error);
      message.error('Something error');
      setTxs([]);
    }
  }, [
    reserve,
    currentAccount,
    pools,
    chainInfo,
    isRiskToLiquidation,
    isError,
    visible,
    isNativeToken,
    wrapperPoolReserve?.underlyingAsset,
    selectedMarketData?.chainId,
  ]);

  useEffect(() => {
    if (!currentAccount || !canShowDirectSubmit) {
      prefetch({ txs: [] });
      return;
    }
    closeSign();
    if (!txs.length) {
      prefetch({ txs: [] });
      return;
    }
    prefetch({
      txs,
      ga: {
        category: 'Lending',
        source: 'Lending',
        trigger: reserve?.usageAsCollateralEnabledOnUser
          ? 'ToggleCollateralOff'
          : 'ToggleCollateralOn',
      },
    }).catch((error) => {
      if (error !== MINI_SIGN_ERROR.PREFETCH_FAILURE) {
        console.error('lending toggle collateral prefetch error', error);
      }
    });
  }, [
    currentAccount,
    canShowDirectSubmit,
    txs,
    prefetch,
    closeSign,
    reserve?.usageAsCollateralEnabledOnUser,
  ]);

  useEffect(() => {
    if (!visible) {
      setTxs([]);
      setIsChecked(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) buildTx();
  }, [visible, buildTx]);

  const btnTitle = useMemo(() => {
    return reserve?.usageAsCollateralEnabledOnUser
      ? t('page.lending.toggleCollateralDetail.disable', {
          asset: reserve?.reserve.symbol,
        })
      : t('page.lending.toggleCollateralDetail.enable', {
          asset: reserve?.reserve.symbol,
        });
  }, [reserve?.usageAsCollateralEnabledOnUser, reserve?.reserve.symbol, t]);

  const title = useMemo(() => {
    if (reserve?.reserve.isIsolated) {
      return reserve?.usageAsCollateralEnabledOnUser
        ? t('page.lending.toggleCollateralModal.exitIsolationModeTitle')
        : t('page.lending.toggleCollateralModal.enableIsolationModeTitle');
    }
    return reserve?.usageAsCollateralEnabledOnUser
      ? t('page.lending.toggleCollateralModal.closeTitle')
      : t('page.lending.toggleCollateralModal.openTitle');
  }, [reserve?.reserve.isIsolated, reserve?.usageAsCollateralEnabledOnUser, t]);

  const desc = useMemo(() => {
    if (reserve?.reserve.isIsolated) {
      return reserve?.usageAsCollateralEnabledOnUser
        ? t('page.lending.toggleCollateralModal.exitIsolationModeDesc')
        : t('page.lending.toggleCollateralModal.enableIsolationModeDesc');
    }
    if (reserve?.usageAsCollateralEnabledOnUser) {
      if (summary?.totalBorrowsUSD === '0') return '';
      return t('page.lending.toggleCollateralModal.closeDesc');
    }
    return t('page.lending.toggleCollateralModal.openDesc');
  }, [
    reserve?.reserve.isIsolated,
    reserve?.usageAsCollateralEnabledOnUser,
    summary?.totalBorrowsUSD,
    t,
  ]);

  const handleToggleCollateral = useCallback(
    async (forceFullSign?: boolean) => {
      if (!currentAccount || !txs.length) return;

      try {
        if (canShowDirectSubmit && !forceFullSign) {
          setMiniSignLoading(true);
          try {
            const hashes = await openDirect({
              txs,
              getContainer,
              ga: {
                category: 'Lending',
                source: 'Lending',
                trigger: reserve?.usageAsCollateralEnabledOnUser
                  ? 'ToggleCollateralOff'
                  : 'ToggleCollateralOn',
              },
            });
            const hash = hashes[hashes.length - 1];
            if (hash) {
              message.success(`${btnTitle} ${t('page.lending.submitted')}`);
              onCancel();
            }
          } catch (error) {
            if (error === MINI_SIGN_ERROR.USER_CANCELLED) {
              onCancel();
              return;
            }
            if (error === MINI_SIGN_ERROR.CANT_PROCESS) {
              return;
            }
            await handleToggleCollateral(true);
            return;
          } finally {
            setMiniSignLoading(false);
          }
          return;
        }

        setIsLoading(true);
        onCancel();
        for (let i = 0; i < txs.length; i++) {
          await wallet.sendRequest(
            {
              method: 'eth_sendTransaction',
              params: [txs[i]],
              $ctx: {
                ga: {
                  category: 'Lending',
                  source: 'Lending',
                  trigger: reserve?.usageAsCollateralEnabledOnUser
                    ? 'ToggleCollateralOff'
                    : 'ToggleCollateralOn',
                },
              },
            },
            {
              account: currentAccount,
            }
          );
        }
        message.success(`${btnTitle} ${t('page.lending.submitted')}`);
      } catch (error) {
        console.error('Toggle collateral error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentAccount,
      txs,
      canShowDirectSubmit,
      openDirect,
      wallet,
      onCancel,
      btnTitle,
      t,
      reserve?.usageAsCollateralEnabledOnUser,
      getContainer,
    ]
  );

  const canSubmit = useMemo(() => {
    return (
      txs.length > 0 &&
      currentAccount &&
      !isLoading &&
      !isRiskToLiquidation &&
      !isError &&
      (!showRisk || isChecked)
    );
  }, [
    currentAccount,
    isChecked,
    isError,
    isLoading,
    isRiskToLiquidation,
    showRisk,
    txs.length,
  ]);

  if (!reserve?.reserve?.symbol) return null;

  const descCardText = reserve?.reserve.isIsolated
    ? 'text-r-neutral-foot'
    : 'text-rb-orange-default';

  return (
    <div className="bg-r-neutral-bg-2 rounded-[12px] p-[24px]">
      <h2 className="text-[20px] leading-[24px] font-medium text-center text-r-neutral-title-1">
        {title}
      </h2>

      {!!desc && (
        <div
          className={`mt-16 flex items-start gap-2 py-12 px-16 rounded-[8px] bg-rb-neutral-card-1 ${descCardText}`}
        >
          <RcIconWarningCC
            viewBox="0 0 16 16"
            className="w-12 h-12 flex-shrink-0 mt-2"
          />
          <span className="text-[13px] leading-[16px] font-medium flex-1">
            {desc}
          </span>
        </div>
      )}

      {summary && (
        <ToggleCollateralOverView
          reserve={reserve}
          userSummary={summary}
          afterHF={afterHF}
        />
      )}

      {canShowDirectSubmit &&
        chainInfo?.serverId &&
        txs.length > 0 &&
        !isRiskToLiquidation &&
        !isError && (
          <div className="mt-16">
            <DirectSignGasInfo
              supportDirectSign
              loading={isLoading}
              openShowMore={() => {}}
              chainServeId={chainInfo.serverId}
              noQuote={false}
              type="send"
            />
          </div>
        )}

      {isError && (
        <div className="mt-16 py-8 px-8 rounded-[8px] bg-rb-red-light-1">
          <span className="text-[14px] leading-[18px] font-medium text-rb-red-default">
            {errorMessage}
          </span>
        </div>
      )}

      {isRiskToLiquidation && !isError && (
        <div className="mt-16 py-8 px-8 rounded-[8px] bg-rb-red-light-1">
          <span className="text-[14px] leading-[18px] font-medium text-rb-red-default">
            {t('page.lending.toggleCollateralModal.riskToLiquidationText')}
          </span>
        </div>
      )}

      {showRisk && !isError && !isRiskToLiquidation && (
        <div className="mt-16 flex flex-col gap-12">
          <div className="flex items-center gap-8 py-8 px-10 rounded-[8px] bg-rb-red-light-1">
            <RcIconWarningCC
              viewBox="0 0 16 16"
              className="w-15 h-15 text-rb-red-default flex-shrink-0"
            />
            <span className="text-[14px] leading-[18px] font-medium text-rb-red-default flex-1">
              {t('page.lending.risk.toggleCollateralWarning')}
            </span>
          </div>
          <div className="flex items-center justify-center gap-8">
            <StyledCheckbox
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="text-[13px] text-r-neutral-foot"
            >
              {t('page.lending.risk.checkbox')}
            </StyledCheckbox>
          </div>
        </div>
      )}

      {canShowDirectSubmit && currentAccount?.type ? (
        <DirectSignToConfirmBtn
          className="mt-20"
          title={btnTitle}
          disabled={!canSubmit}
          loading={miniSignLoading}
          onConfirm={() => handleToggleCollateral()}
          accountType={currentAccount.type}
        />
      ) : (
        <Button
          type="primary"
          block
          size="large"
          className="mt-20 h-[48px] rounded-[8px] font-medium text-[16px]"
          loading={isLoading}
          disabled={!canSubmit}
          onClick={() => handleToggleCollateral()}
        >
          {btnTitle}
        </Button>
      )}
    </div>
  );
};
