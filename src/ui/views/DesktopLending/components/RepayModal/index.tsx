import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, message } from 'antd';
import BigNumber from 'bignumber.js';
import { parseUnits } from 'ethers/lib/utils';
import { isSameAddress } from '@/ui/utils';
import { useWallet } from '@/ui/utils/WalletContext';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { DisplayPoolReserveInfo, UserSummary } from '../../types';
import { calculateHFAfterRepay } from '../../utils/hfUtils';
import { buildRepayTx, optimizedPath } from '../../utils/poolService';
import { REPAY_AMOUNT_MULTIPLIER } from '../../utils/constant';
import { RepayOverView } from './RepayOverView';
import SymbolIcon from '../SymbolIcon';
import {
  useLendingSummary,
  useSelectedMarket,
  usePoolDataProviderContract,
} from '../../hooks';
import { ETH_USDT_CONTRACT } from '@/constant';
import { INPUT_NUMBER_RE, filterNumber } from '@/constant/regexp';
import { formatTokenAmount, formatUsdValue } from '@/ui/utils/number';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { DirectSignToConfirmBtn } from '@/ui/component/ToConfirmButton';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { DirectSignGasInfo } from '@/ui/views/Bridge/Component/BridgeShowMore';

type RepayModalProps = {
  visible: boolean;
  onCancel: () => void;
  reserve: DisplayPoolReserveInfo;
  userSummary: UserSummary | null;
  onSuccess?: () => void;
};

export const RepayModal: React.FC<RepayModalProps> = ({
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
  const { selectedMarketData, chainInfo, isMainnet } = useSelectedMarket();
  const { pools } = usePoolDataProviderContract();

  const summary = userSummary ?? contextUserSummary;

  const [_amount, setAmount] = useState<string | undefined>(undefined);

  const [needApprove, setNeedApprove] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [miniSignLoading, setMiniSignLoading] = useState(false);
  const [repayTx, setRepayTx] = useState<Tx | null>(null);
  const [approveTxs, setApproveTxs] = useState<Tx[] | null>(null);

  const repayAmount = useMemo(() => {
    const walletBal = new BigNumber(reserve.walletBalance || '0');
    const debt = new BigNumber(reserve.variableBorrows || '0');
    const miniAmount = walletBal.gte(debt) ? debt : walletBal;
    const usdValue = miniAmount
      .multipliedBy(
        new BigNumber(
          reserve.reserve.formattedPriceInMarketReferenceCurrency || '0'
        )
      )
      .toString();
    const isDebtUp = miniAmount.eq(debt);
    return {
      amount: miniAmount.toString(),
      usdValue,
      isDebtUp,
    };
  }, [
    reserve.walletBalance,
    reserve.variableBorrows,
    reserve.reserve.formattedPriceInMarketReferenceCurrency,
  ]);

  const amount = useMemo(() => {
    return _amount === '-1' ? repayAmount.amount : _amount;
  }, [_amount, repayAmount.amount]);

  const afterHF = useMemo(() => {
    if (!amount || amount === '0' || !summary) return undefined;
    return calculateHFAfterRepay({
      user: summary,
      amount,
      debt: reserve.variableBorrows,
      usdPrice: reserve.reserve.formattedPriceInMarketReferenceCurrency,
    }).toString();
  }, [
    amount,
    summary,
    reserve.variableBorrows,
    reserve.reserve.formattedPriceInMarketReferenceCurrency,
  ]);

  const afterRepayAmount = useMemo(
    () =>
      new BigNumber(reserve.variableBorrows || '0')
        .minus(amount || '0')
        .toString(),
    [amount, reserve.variableBorrows]
  );

  const afterRepayUsdValue = useMemo(
    () =>
      new BigNumber(afterRepayAmount || '0')
        .multipliedBy(
          new BigNumber(
            reserve.reserve.formattedPriceInMarketReferenceCurrency || '0'
          )
        )
        .toString(),
    [afterRepayAmount, reserve.reserve.formattedPriceInMarketReferenceCurrency]
  );

  const txsForMiniApproval = useMemo(() => {
    const list: Tx[] = [];
    if (approveTxs?.length) {
      list.push(...approveTxs);
    }
    if (repayTx) {
      list.push(repayTx);
    }
    return list;
  }, [approveTxs, repayTx]);

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

  const checkApproveStatus = useCallback(async () => {
    if (!amount || amount === '0' || !currentAccount || !selectedMarketData) {
      setNeedApprove(false);
      return;
    }
    if (!chainInfo) return;
    if (isSameAddress(reserve.underlyingAsset, chainInfo.nativeTokenAddress)) {
      setNeedApprove(false);
      return;
    }
    try {
      const allowance = await wallet.getERC20Allowance(
        chainInfo.serverId,
        reserve.underlyingAsset,
        selectedMarketData.addresses.LENDING_POOL
      );
      const requiredAmount = new BigNumber(amount)
        .multipliedBy(10 ** reserve.reserve.decimals)
        .toString();
      const isApproved = new BigNumber(allowance || '0').gte(requiredAmount);
      setNeedApprove(!isApproved);
    } catch {
      setNeedApprove(true);
    }
  }, [
    amount,
    currentAccount,
    selectedMarketData,
    chainInfo,
    reserve.underlyingAsset,
    reserve.reserve.decimals,
    wallet,
  ]);

  const buildTransactions = useCallback(async () => {
    if (
      !amount ||
      amount === '0' ||
      !currentAccount ||
      !selectedMarketData ||
      !pools ||
      !chainInfo
    ) {
      setRepayTx(null);
      setApproveTxs(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const txs: Tx[] = [];
      let allowance = '0';
      if (
        !isSameAddress(reserve.underlyingAsset, chainInfo.nativeTokenAddress)
      ) {
        allowance = await wallet.getERC20Allowance(
          chainInfo.serverId,
          reserve.underlyingAsset,
          selectedMarketData.addresses.LENDING_POOL
        );
        const requiredAmount = new BigNumber(amount)
          .multipliedBy(10 ** reserve.reserve.decimals)
          .toString();
        const actualNeedApprove = !new BigNumber(allowance || '0').gte(
          requiredAmount
        );
        if (actualNeedApprove) {
          const requiredAmountStr = new BigNumber(amount)
            .multipliedBy(10 ** reserve.reserve.decimals)
            .toFixed();
          const isMaxRepay = new BigNumber(amount).eq(
            reserve.variableBorrows || '0'
          );
          const approveAmountStr = isMaxRepay
            ? new BigNumber(amount)
                .multipliedBy(REPAY_AMOUNT_MULTIPLIER)
                .multipliedBy(10 ** reserve.reserve.decimals)
                .integerValue(BigNumber.ROUND_UP)
                .toFixed()
            : requiredAmountStr;
          const shouldTwoStepApprove =
            isMainnet &&
            isSameAddress(reserve.underlyingAsset, ETH_USDT_CONTRACT) &&
            Number(allowance) !== 0 &&
            !new BigNumber(allowance || '0').gte(requiredAmountStr);
          if (shouldTwoStepApprove) {
            const zeroResp = await wallet.approveToken(
              chainInfo.serverId,
              reserve.underlyingAsset,
              selectedMarketData.addresses.LENDING_POOL,
              0,
              undefined,
              undefined,
              undefined,
              true,
              currentAccount
            );
            const zeroTx = (zeroResp as { params: [Tx] })?.params?.[0];
            if (zeroTx) txs.push(zeroTx);
          }
          const approveResp = await wallet.approveToken(
            chainInfo.serverId,
            reserve.underlyingAsset,
            selectedMarketData.addresses.LENDING_POOL,
            approveAmountStr,
            undefined,
            undefined,
            undefined,
            true,
            currentAccount
          );
          const approveTx = (approveResp as { params: [Tx] })?.params?.[0];
          if (approveTx) txs.push(approveTx);
        }
      }
      setApproveTxs(txs.length ? txs : null);

      const repayResult = await buildRepayTx({
        poolBundle: pools.poolBundle,
        amount:
          _amount === '-1'
            ? '-1'
            : parseUnits(amount, reserve.reserve.decimals).toString(),
        address: currentAccount.address,
        reserve: reserve.underlyingAsset,
        useOptimizedPath: optimizedPath(selectedMarketData.chainId),
        repayWithATokens: false,
      });
      delete repayResult.gasLimit;

      setRepayTx(({
        ...repayResult,
        chainId: chainInfo.id,
      } as unknown) as Tx);
    } catch (error) {
      console.error('Build transactions error:', error);
      message.error(t('page.lending.submitted') || 'Something error');
      setRepayTx(null);
      setApproveTxs(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    amount,
    _amount,
    currentAccount,
    selectedMarketData,
    pools,
    chainInfo,
    reserve.underlyingAsset,
    reserve.reserve.decimals,
    reserve.variableBorrows,
    isMainnet,
    wallet,
    t,
  ]);

  useEffect(() => {
    if (!currentAccount || !canShowDirectSubmit) {
      prefetch({ txs: [] });
      return;
    }
    closeSign();
    if (!txsForMiniApproval.length) {
      prefetch({ txs: [] });
      return;
    }
    prefetch({
      txs: txsForMiniApproval,
      ga: {
        category: 'Lending',
        source: 'Lending',
        trigger: 'Repay',
      },
    }).catch((error) => {
      if (error !== MINI_SIGN_ERROR.PREFETCH_FAILURE) {
        console.error('lending repay prefetch error', error);
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
      setRepayTx(null);
      setApproveTxs(null);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) checkApproveStatus();
  }, [visible, checkApproveStatus]);

  useEffect(() => {
    if (visible) buildTransactions();
  }, [visible, buildTransactions]);

  const handleRepay = useCallback(
    async (forceFullSign?: boolean) => {
      if (
        !currentAccount ||
        !repayTx ||
        !amount ||
        amount === '0' ||
        !chainInfo
      ) {
        return;
      }
      const allTxs: Tx[] = [...(approveTxs || []), repayTx];
      if (!allTxs.length) {
        message.info(t('page.lending.submitted') || 'Please retry');
        return;
      }

      try {
        if (canShowDirectSubmit && !forceFullSign) {
          setMiniSignLoading(true);
          try {
            const hashes = await openDirect({
              txs: allTxs,
              ga: {
                category: 'Lending',
                source: 'Lending',
                trigger: 'Repay',
              },
            });
            const hash = hashes[hashes.length - 1];
            if (hash) {
              message.success(
                `${t('page.lending.repayDetail.actions')} ${t(
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
            await handleRepay(true);
            return;
          } finally {
            setMiniSignLoading(false);
          }
          return;
        }

        setIsLoading(true);
        for (let i = 0; i < allTxs.length; i++) {
          const tx = allTxs[i];
          await wallet.sendRequest({
            method: 'eth_sendTransaction',
            params: [tx],
            $ctx: {
              ga: {
                category: 'Lending',
                source: 'Lending',
                trigger: 'Repay',
              },
            },
          });
        }
        message.success(
          `${t('page.lending.repayDetail.actions')} ${t(
            'page.lending.submitted'
          )}`
        );
        setAmount(undefined);
        onCancel();
        onSuccess?.();
      } catch (error) {
        console.error('Repay error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentAccount,
      repayTx,
      amount,
      approveTxs,
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
          const maxAmount = new BigNumber(repayAmount.amount || '0');
          const inputAmount = new BigNumber(filtered);
          if (inputAmount.gt(maxAmount)) {
            setAmount(repayAmount.amount || '0');
          } else {
            setAmount(filtered);
          }
        } else {
          setAmount(undefined);
        }
      }
    },
    [repayAmount.amount]
  );

  const emptyAmount = !repayAmount.amount || repayAmount.amount === '0';
  const canSubmit =
    amount && amount !== '0' && repayTx && currentAccount && !isLoading;

  if (!reserve?.reserve?.symbol) return null;

  return (
    <div className="bg-r-neutral-bg-2 rounded-[12px] p-[24px]">
      <h2 className="text-[20px] leading-[24px] font-medium text-center text-r-neutral-title-1">
        {t('page.lending.repayDetail.actions')} {reserve.reserve.symbol}
      </h2>

      <div className="mt-16">
        <div className="flex items-center justify-between mb-8">
          <span className="text-[13px] leading-[15px] text-r-neutral-foot">
            {t('page.lending.popup.amount')}
          </span>
          <span
            className={`text-[13px] leading-[15px] ${
              emptyAmount ? 'text-rb-red-default' : 'text-r-neutral-foot'
            }`}
          >
            {formatTokenAmount(repayAmount.amount || '0')}{' '}
            {reserve.reserve.symbol} (
            {formatUsdValue(Number(repayAmount.usdValue || '0'))}){' '}
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
                {formatTokenAmount(repayAmount.amount || '0')}
              </span>
              <button
                type="button"
                className={`
                  px-4 py-2 rounded-[2px] 
                  bg-rb-brand-light-1 
                  text-rb-brand-default font-medium text-[11px] leading-[13px] 
                  hover:bg-rb-brand-light-2 disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                onClick={() => setAmount(repayAmount.amount || '0')}
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
        <RepayOverView
          reserve={reserve}
          userSummary={summary}
          amount={amount}
          afterRepayAmount={afterRepayAmount}
          afterRepayUsdValue={afterRepayUsdValue}
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

      {canShowDirectSubmit && currentAccount?.type ? (
        <DirectSignToConfirmBtn
          className="mt-20"
          title={
            <>
              {t('page.lending.repayDetail.actions')} {reserve.reserve.symbol}
            </>
          }
          disabled={!canSubmit}
          loading={miniSignLoading}
          onConfirm={() => handleRepay()}
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
          onClick={() => handleRepay()}
        >
          {t('page.lending.repayDetail.actions')} {reserve.reserve.symbol}
        </Button>
      )}
    </div>
  );
};
