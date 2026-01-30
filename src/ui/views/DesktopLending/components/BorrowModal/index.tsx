import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, message, Checkbox } from 'antd';
import BigNumber from 'bignumber.js';
import { parseUnits } from 'ethers/lib/utils';
import { useWallet } from '@/ui/utils/WalletContext';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { DisplayPoolReserveInfo, UserSummary } from '../../types';
import {
  calculateHealthFactorFromBalancesBigUnits,
  valueToBigNumber,
} from '@aave/math-utils';
import { buildBorrowTx, optimizedPath } from '../../utils/poolService';
import {
  BORROW_SAFE_MARGIN,
  HF_RISK_CHECKBOX_THRESHOLD,
} from '../../utils/constant';
import { BorrowOverView } from './BorrowOverView';
import { BorrowErrorTip } from './BorrowErrorTip';
import { BorrowToCapTip } from './BorrowToCapTip';
import SymbolIcon from '../SymbolIcon';
import {
  useLendingSummary,
  useSelectedMarket,
  usePoolDataProviderContract,
} from '../../hooks';
import { INTERNAL_REQUEST_SESSION } from '@/constant';
import { INPUT_NUMBER_RE, filterNumber } from '@/constant/regexp';
import { formatTokenAmount, formatUsdValue } from '@/ui/utils/number';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { DirectSignToConfirmBtn } from '@/ui/component/ToConfirmButton';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { DirectSignGasInfo } from '@/ui/views/Bridge/Component/BridgeShowMore';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';

type BorrowModalProps = {
  visible: boolean;
  onCancel: () => void;
  reserve: DisplayPoolReserveInfo;
  userSummary: UserSummary | null;
  onSuccess?: () => void;
};

export const BorrowModal: React.FC<BorrowModalProps> = ({
  visible,
  onCancel,
  reserve,
  userSummary,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const currentAccount = useCurrentAccount();
  const {
    formattedPoolReservesAndIncentives,
    iUserSummary: contextUserSummary,
  } = useLendingSummary();
  const { selectedMarketData, chainInfo, chainEnum } = useSelectedMarket();
  const { pools } = usePoolDataProviderContract();

  const summary = userSummary ?? contextUserSummary;

  const [amount, setAmount] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [miniSignLoading, setMiniSignLoading] = useState(false);
  const [borrowTx, setBorrowTx] = useState<Tx | null>(null);
  const [isChecked, setIsChecked] = useState(false);

  const targetPool = useMemo(() => {
    if (!formattedPoolReservesAndIncentives?.length) return undefined;
    return formattedPoolReservesAndIncentives.find(
      (item) => item.underlyingAsset === reserve.underlyingAsset
    );
  }, [formattedPoolReservesAndIncentives, reserve.underlyingAsset]);

  const availableToBorrow = useMemo(() => {
    const myAmount = new BigNumber(summary?.availableBorrowsUSD || '0')
      .dividedBy(
        new BigNumber(
          reserve.reserve.formattedPriceInMarketReferenceCurrency || '0'
        )
      )
      .multipliedBy(BORROW_SAFE_MARGIN);
    const poolAmount = new BigNumber(reserve.reserve.borrowCap)
      .minus(new BigNumber(reserve.reserve.totalDebt))
      .multipliedBy(BORROW_SAFE_MARGIN);
    const formattedPoolAmount = poolAmount.lt(0)
      ? new BigNumber(0)
      : poolAmount;
    const miniAmount = myAmount.gte(formattedPoolAmount)
      ? formattedPoolAmount
      : myAmount;
    const usdValue = miniAmount
      .multipliedBy(
        new BigNumber(
          reserve.reserve.formattedPriceInMarketReferenceCurrency || '0'
        )
      )
      .toString();
    return {
      isLteZero: miniAmount.lte(0),
      amount: miniAmount.toString(),
      usdValue,
    };
  }, [
    summary?.availableBorrowsUSD,
    reserve.reserve.borrowCap,
    reserve.reserve.totalDebt,
    reserve.reserve.formattedPriceInMarketReferenceCurrency,
  ]);

  const afterHF = useMemo(() => {
    if (!amount || amount === '0' || !summary || !targetPool) return undefined;
    const borrowAmountInUsd = new BigNumber(amount)
      .multipliedBy(targetPool.formattedPriceInMarketReferenceCurrency)
      .toString();
    return calculateHealthFactorFromBalancesBigUnits({
      collateralBalanceMarketReferenceCurrency: summary.totalCollateralUSD,
      borrowBalanceMarketReferenceCurrency: valueToBigNumber(
        summary.totalBorrowsUSD
      ).plus(borrowAmountInUsd),
      currentLiquidationThreshold: summary.currentLiquidationThreshold,
    }).toString();
  }, [amount, targetPool, summary]);

  const isRisky = useMemo(() => {
    if (!afterHF || Number(afterHF) < 0) {
      return false;
    }
    return Number(afterHF) < HF_RISK_CHECKBOX_THRESHOLD;
  }, [afterHF]);

  const showBorrowToCapTip = useMemo(() => {
    if (!reserve?.reserve?.totalDebt || !reserve?.reserve?.borrowCap) {
      return false;
    }
    return new BigNumber(reserve.reserve.totalDebt).gte(
      reserve.reserve.borrowCap
    );
  }, [reserve?.reserve?.totalDebt, reserve?.reserve?.borrowCap]);

  const txsForMiniApproval = useMemo(() => {
    const list: Tx[] = [];
    if (borrowTx) {
      list.push(borrowTx);
    }
    return list;
  }, [borrowTx]);

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

  const buildTransactions = useCallback(async () => {
    if (
      !amount ||
      amount === '0' ||
      !currentAccount ||
      !selectedMarketData ||
      !pools ||
      !chainInfo ||
      !targetPool
    ) {
      setBorrowTx(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      if (!targetPool.variableDebtTokenAddress) {
        return;
      }

      const borrowResult = await buildBorrowTx({
        poolBundle: pools.poolBundle,
        amount: parseUnits(amount, reserve.reserve.decimals).toString(),
        address: currentAccount.address,
        reserve: reserve.underlyingAsset,
        debtTokenAddress: targetPool.variableDebtTokenAddress,
        useOptimizedPath: optimizedPath(selectedMarketData.chainId),
      });
      const result = borrowResult as {
        to?: string;
        data?: string;
        value?: { toHexString?: () => string };
        from?: string;
        gasLimit?: number;
      };
      delete (result as Record<string, unknown>).gasLimit;
      const formattedBorrowResult: Tx = {
        ...result,
        from: result.from || currentAccount.address,
        value:
          typeof result.value === 'object' && result.value?.toHexString
            ? result.value.toHexString()
            : (result.value as string) || '0x0',
        chainId: chainInfo.id,
      } as Tx;
      setBorrowTx(formattedBorrowResult);
    } catch (error) {
      console.error('Build transactions error:', error);
      message.error(t('page.lending.submitted') || 'Something error');
      setBorrowTx(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    amount,
    currentAccount,
    selectedMarketData,
    pools,
    chainInfo,
    reserve.underlyingAsset,
    reserve.reserve.decimals,
    targetPool,
    wallet,
    t,
  ]);

  useEffect(() => {
    if (!currentAccount || !canShowDirectSubmit) {
      prefetch({
        txs: [],
      });
      return;
    }

    closeSign();
    if (!txsForMiniApproval.length) {
      prefetch({
        txs: [],
      });
      return;
    }

    prefetch({
      txs: txsForMiniApproval,
      ga: {
        category: 'Lending',
        source: 'Lending',
        trigger: 'Borrow',
      },
    }).catch((error) => {
      if (error !== MINI_SIGN_ERROR.PREFETCH_FAILURE) {
        console.error('lending borrow prefetch error', error);
      }
    });
  }, [
    currentAccount,
    canShowDirectSubmit,
    txsForMiniApproval,
    prefetch,
    closeSign,
  ]);

  useEffect(() => {
    if (!visible) {
      setAmount(undefined);
      setBorrowTx(null);
      setIsChecked(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) buildTransactions();
  }, [visible, buildTransactions]);

  const handleBorrow = useCallback(
    async (forceFullSign?: boolean) => {
      if (
        !currentAccount ||
        !borrowTx ||
        !amount ||
        amount === '0' ||
        !chainInfo
      ) {
        return;
      }
      if (!borrowTx) {
        message.info(t('page.lending.submitted') || 'Please retry');
        return;
      }

      try {
        if (canShowDirectSubmit && !forceFullSign) {
          setMiniSignLoading(true);
          try {
            const hashes = await openDirect({
              txs: [borrowTx],
              ga: {
                category: 'Lending',
                source: 'Lending',
                trigger: 'Borrow',
              },
            });
            const hash = hashes[hashes.length - 1];
            if (hash) {
              message.success(
                `${t('page.lending.borrowDetail.actions')} ${t(
                  'page.lending.submitted'
                )}`
              );
              setAmount(undefined);
              onCancel();
              onSuccess?.();
            }
          } catch (error) {
            if (
              error === MINI_SIGN_ERROR.USER_CANCELLED ||
              error === MINI_SIGN_ERROR.CANT_PROCESS
            ) {
              return;
            }
            await handleBorrow(true);
            return;
          } finally {
            setMiniSignLoading(false);
          }
          return;
        }

        setIsLoading(true);
        await wallet.sendRequest({
          method: 'eth_sendTransaction',
          params: [borrowTx],
          $ctx: {
            ga: {
              category: 'Lending',
              source: 'Lending',
              trigger: 'Borrow',
            },
          },
        });
        message.success(
          `${t('page.lending.borrowDetail.actions')} ${t(
            'page.lending.submitted'
          )}`
        );
        setAmount(undefined);
        onCancel();
        onSuccess?.();
      } catch (error) {
        console.error('Borrow error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentAccount,
      borrowTx,
      amount,
      chainInfo,
      wallet,
      onCancel,
      onSuccess,
      t,
      canShowDirectSubmit,
      openDirect,
    ]
  );

  const onAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v === '' || INPUT_NUMBER_RE.test(v)) {
        const filtered = v === '' ? undefined : filterNumber(v);
        if (filtered) {
          const maxAmount = new BigNumber(availableToBorrow.amount || '0');
          const inputAmount = new BigNumber(filtered);
          if (inputAmount.gt(maxAmount)) {
            setAmount(availableToBorrow.amount || '0');
          } else {
            setAmount(filtered);
          }
        } else {
          setAmount(undefined);
        }
      }
    },
    [availableToBorrow.amount]
  );

  const emptyAmount =
    !availableToBorrow.amount || availableToBorrow.amount === '0';
  const canSubmit =
    amount &&
    amount !== '0' &&
    borrowTx &&
    currentAccount &&
    !isLoading &&
    (!isRisky || isChecked);

  if (!reserve?.reserve?.symbol) return null;

  return (
    <div className="bg-r-neutral-bg-2 rounded-[12px] p-[24px]">
      <h2 className="text-[20px] leading-[24px] font-bold text-center text-r-neutral-title-1">
        {t('page.lending.borrowDetail.actions')} {reserve.reserve.symbol}
      </h2>

      <BorrowErrorTip reserve={reserve} className="mt-16" />

      <div className="mt-16">
        <div className="flex items-center justify-between mb-8">
          <span className="text-[13px] leading-[15px] text-r-neutral-foot">
            {t('page.lending.popup.amount')}
          </span>
          <span className="text-[13px] leading-[15px] text-r-neutral-foot">
            {formatTokenAmount(availableToBorrow.amount || '0')}{' '}
            {reserve.reserve.symbol} (
            {formatUsdValue(Number(availableToBorrow.usdValue || '0'))}){' '}
            {t('page.lending.popup.available')}
          </span>
        </div>
        <div className="flex items-start gap-4 p-16 rounded-[8px] bg-rb-neutral-card-1">
          <div className="flex items-start flex-shrink-0 flex-col gap-8">
            <div className="flex items-center gap-6">
              <SymbolIcon tokenSymbol={reserve.reserve.symbol} size={24} />
              <span className="text-[20px] leading-[20px] font-medium text-r-neutral-title-1">
                {reserve.reserve.symbol}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <RcIconWalletCC
                viewBox="0 0 16 16"
                className="w-16 h-16 text-r-neutral-foot"
              />
              <span className="text-[13px] leading-[16px] text-r-neutral-foot">
                {formatTokenAmount(availableToBorrow.amount || '0')}
              </span>
              <button
                type="button"
                className={`
                  px-4 py-2 rounded-[2px] 
                  bg-rb-brand-light-1 
                  text-rb-brand-default font-medium text-[11px] leading-[13px] 
                  hover:bg-rb-brand-light-2 disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                onClick={() => setAmount(availableToBorrow.amount || '0')}
                disabled={emptyAmount}
              >
                MAX
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-end min-w-0">
            <Input
              value={amount ?? ''}
              onChange={onAmountChange}
              placeholder="0"
              className="text-right border-0 bg-transparent p-0 h-auto hover:border-r-0"
              style={{
                fontSize: '20px',
                lineHeight: '28px',
                fontWeight: 500,
                color: 'var(--r-neutral-title-1)',
              }}
            />
            {amount && amount !== '0' && (
              <span className="text-[13px] leading-[15px] text-r-neutral-foot mt-1">
                {formatUsdValue(
                  Number(amount) *
                    Number(
                      reserve.reserve.formattedPriceInMarketReferenceCurrency ||
                        0
                    )
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {summary && (
        <BorrowOverView
          reserve={reserve}
          userSummary={summary}
          afterHF={afterHF}
        />
      )}

      {canShowDirectSubmit && chainInfo?.serverId ? (
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
      ) : null}

      {showBorrowToCapTip && <BorrowToCapTip className="mt-16" />}

      {isRisky && (
        <div className="mt-16 flex flex-col gap-12">
          <div className="flex items-center gap-8 py-8 px-10 rounded-[8px] bg-rb-red-light-1">
            <RcIconWarningCC
              viewBox="0 0 16 16"
              className="w-15 h-15 text-rb-red-default flex-shrink-0"
            />
            <span className="text-[14px] leading-[18px] font-medium text-rb-red-default flex-1">
              {t('page.lending.risk.warning')}
            </span>
          </div>
          <div className="flex items-center justify-center gap-8">
            <Checkbox
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="text-[13px] text-r-neutral-foot"
            >
              {t('page.lending.risk.checkbox')}
            </Checkbox>
          </div>
        </div>
      )}

      {canShowDirectSubmit && currentAccount?.type ? (
        <DirectSignToConfirmBtn
          className="mt-6"
          title={
            <>
              {t('page.lending.borrowDetail.actions')} {reserve.reserve.symbol}
            </>
          }
          disabled={!canSubmit}
          loading={miniSignLoading}
          onConfirm={() => handleBorrow()}
          accountType={currentAccount.type}
        />
      ) : (
        <Button
          type="primary"
          block
          size="large"
          className="mt-6 h-[48px] rounded-[8px] font-medium text-[16px]"
          loading={isLoading}
          disabled={!canSubmit}
          onClick={() => handleBorrow()}
        >
          {t('page.lending.borrowDetail.actions')} {reserve.reserve.symbol}
        </Button>
      )}
    </div>
  );
};
