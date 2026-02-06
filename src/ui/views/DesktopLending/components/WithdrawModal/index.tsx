import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, message, Checkbox } from 'antd';
import BigNumber from 'bignumber.js';
import { isSameAddress } from '@/ui/utils';
import { useWallet } from '@/ui/utils/WalletContext';
import { useSceneAccount } from '@/ui/hooks/backgroundState/useAccount';
import { DisplayPoolReserveInfo, UserSummary } from '../../types';
import { API_ETH_MOCK_ADDRESS } from '../../utils/constant';
import wrapperToken from '../../config/wrapperToken';
import { calculateHFAfterWithdraw } from '../../utils/hfUtils';
import { calculateMaxWithdrawAmount } from '../../utils/calculateMaxWithdrawAmount';
import { buildWithdrawTx, optimizedPath } from '../../utils/poolService';
import {
  HF_RISK_CHECKBOX_THRESHOLD,
  MAX_CLICK_WITHDRAW_HF_THRESHOLD,
} from '../../utils/constant';
import { WithdrawOverView } from './WithdrawOverView';
import SymbolIcon from '../SymbolIcon';
import { useLendingSummary } from '../../hooks';
import { useSelectedMarket } from '../../hooks/market';
import { usePoolDataProviderContract } from '../../hooks/pool';

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
import { LendingStyledInput } from '../StyledInput';
import stats from '@/stats';
import { LendingReportType } from '../../types/tx';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { isZeroAmount } from '../../utils/number';
import { StyledCheckbox } from '../BorrowModal';

type WithdrawModalProps = {
  visible: boolean;
  onCancel: () => void;
  reserve: DisplayPoolReserveInfo;
  userSummary: UserSummary | null;
};

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
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

  const [_amount, setAmount] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [miniSignLoading, setMiniSignLoading] = useState(false);
  const [withdrawTxs, setWithdrawTxs] = useState<Tx[]>([]);
  const [isChecked, setIsChecked] = useState(false);

  const isNativeToken = useMemo(
    () => isSameAddress(reserve.underlyingAsset, API_ETH_MOCK_ADDRESS),
    [reserve.underlyingAsset]
  );

  const targetPool = useMemo(() => {
    if (!formattedPoolReservesAndIncentives?.length) return undefined;
    return formattedPoolReservesAndIncentives.find((item) => {
      return isSameAddress(reserve.underlyingAsset, API_ETH_MOCK_ADDRESS)
        ? isSameAddress(
            item.underlyingAsset,
            wrapperToken?.[reserve.chain]?.address
          )
        : isSameAddress(item.underlyingAsset, reserve.underlyingAsset);
    });
  }, [
    formattedPoolReservesAndIncentives,
    reserve.underlyingAsset,
    reserve.chain,
  ]);

  const withdrawAmount = useMemo(() => {
    if (!summary || !targetPool) {
      return new BigNumber(reserve.underlyingBalance || '0').toString();
    }
    if (!summary.totalBorrowsUSD || summary.totalBorrowsUSD === '0') {
      return reserve.underlyingBalance || '0';
    }
    const max = calculateMaxWithdrawAmount(
      summary,
      reserve,
      targetPool,
      MAX_CLICK_WITHDRAW_HF_THRESHOLD
    );
    return max.toString();
  }, [summary, targetPool, reserve]);

  const amount = useMemo(() => {
    return _amount === '-1' ? withdrawAmount.toString() : _amount;
  }, [_amount, withdrawAmount]);

  const afterHF = useMemo(() => {
    if (!amount || isZeroAmount(amount) || !summary || !targetPool) {
      return undefined;
    }
    return calculateHFAfterWithdraw({
      user: summary,
      userReserve: reserve,
      poolReserve: targetPool,
      withdrawAmount: amount,
    }).toString();
  }, [amount, targetPool, summary, reserve]);

  const afterSupply = useMemo(() => {
    if (!amount || isZeroAmount(amount)) {
      return undefined;
    }
    const balance = new BigNumber(reserve.underlyingBalance || '0').minus(
      new BigNumber(amount)
    );
    const balanceUSD = balance.multipliedBy(
      new BigNumber(
        reserve.reserve.formattedPriceInMarketReferenceCurrency || '0'
      )
    );
    return {
      balance: balance.toString(),
      balanceUSD: balanceUSD.toString(),
    };
  }, [
    amount,
    reserve.reserve.formattedPriceInMarketReferenceCurrency,
    reserve.underlyingBalance,
  ]);

  const isRisky = useMemo(() => {
    if (!afterHF || Number(afterHF) < 0) {
      return false;
    }
    return Number(afterHF) < HF_RISK_CHECKBOX_THRESHOLD;
  }, [afterHF]);

  const txsForMiniApproval = useMemo(() => withdrawTxs, [withdrawTxs]);

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
      isZeroAmount(amount) ||
      !currentAccount ||
      !selectedMarketData ||
      !pools ||
      !chainInfo ||
      !targetPool
    ) {
      setWithdrawTxs([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      if (!targetPool.aTokenAddress) {
        return;
      }

      const withdrawResult = await buildWithdrawTx({
        pool: pools.pool,
        amount: _amount === '-1' ? '-1' : amount,
        address: currentAccount.address,
        reserve: targetPool.underlyingAsset,
        aTokenAddress: targetPool.aTokenAddress,
        useOptimizedPath: optimizedPath(selectedMarketData.chainId),
      });

      const txs = await Promise.all(withdrawResult.map((i) => i.tx()));
      const formatTxs = txs.map((item) => {
        delete item.gasLimit;
        return {
          ...item,
          chainId: chainInfo.id,
        };
      });
      setWithdrawTxs((formatTxs as unknown) as Tx[]);
    } catch (error) {
      console.error('Build transactions error:', error);
      message.error('Something error');
      setWithdrawTxs([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    amount,
    currentAccount,
    selectedMarketData,
    pools,
    chainInfo,
    targetPool,
    _amount,
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
        trigger: 'Withdraw',
      },
    }).catch((error) => {
      if (error !== MINI_SIGN_ERROR.PREFETCH_FAILURE) {
        console.error('lending withdraw prefetch error', error);
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
      setWithdrawTxs([]);
      setIsChecked(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) buildTransactions();
  }, [visible, buildTransactions]);

  const handleWithdraw = useCallback(
    async (forceFullSign?: boolean) => {
      if (
        !currentAccount ||
        !withdrawTxs.length ||
        !amount ||
        isZeroAmount(amount) ||
        !chainInfo
      ) {
        return;
      }
      const report = (lastHash: string) => {
        const targetPool = formattedPoolReservesAndIncentives.find((item) => {
          return isSameAddress(reserve.underlyingAsset, API_ETH_MOCK_ADDRESS)
            ? isSameAddress(
                item.underlyingAsset,
                wrapperToken?.[reserve.chain]?.address
              )
            : isSameAddress(item.underlyingAsset, reserve.underlyingAsset);
        });
        const bgCurrency = new BigNumber(
          targetPool?.formattedPriceInMarketReferenceCurrency || '0'
        );
        const usdValue = targetPool
          ? new BigNumber(amount || '0').multipliedBy(bgCurrency).toString()
          : '0';

        stats.report('aaveInternalTx', {
          tx_type: LendingReportType.Withdraw,
          chain: chainInfo?.serverId || '',
          tx_id: lastHash || '',
          user_addr: currentAccount.address || '',
          address_type: currentAccount.type || '',
          usd_value: usdValue,
          create_at: Date.now(),
          app_version: process.env.release || '0',
        });
      };

      try {
        if (canShowDirectSubmit && !forceFullSign) {
          setMiniSignLoading(true);
          try {
            const hashes = await openDirect({
              txs: withdrawTxs,
              getContainer,
              ga: {
                category: 'Lending',
                source: 'Lending',
                trigger: 'Withdraw',
              },
            });
            const hash = hashes[hashes.length - 1];
            if (hash) {
              report(hash);
              message.success(
                `${t('page.lending.withdrawDetail.actions')} ${t(
                  'page.lending.submitted'
                )}`
              );
              setAmount(undefined);
              onCancel();
            }
          } catch (error) {
            if (
              error === MINI_SIGN_ERROR.USER_CANCELLED ||
              error === MINI_SIGN_ERROR.CANT_PROCESS
            ) {
              return;
            }
            await handleWithdraw(true);
            return;
          } finally {
            setMiniSignLoading(false);
          }
          return;
        }

        setIsLoading(true);
        let lastHash: string = '';
        for (let i = 0; i < withdrawTxs.length; i++) {
          const tx = withdrawTxs[i];
          lastHash = await wallet.sendRequest(
            {
              method: 'eth_sendTransaction',
              params: [tx],
              $ctx: {
                ga: {
                  category: 'Lending',
                  source: 'Lending',
                  trigger: 'Withdraw',
                },
              },
            },
            {
              account: currentAccount,
            }
          );
        }
        report(lastHash);
        message.success(
          `${t('page.lending.withdrawDetail.actions')} ${t(
            'page.lending.submitted'
          )}`
        );
        setAmount(undefined);
        onCancel();
      } catch (error) {
        console.error('Withdraw error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentAccount,
      withdrawTxs,
      amount,
      chainInfo,
      formattedPoolReservesAndIncentives,
      reserve.underlyingAsset,
      reserve.chain,
      canShowDirectSubmit,
      t,
      onCancel,
      openDirect,
      wallet,
      getContainer,
    ]
  );

  const handleChangeAmount = useCallback(
    (v: string) => {
      const maxSelected = v === '-1';
      if (maxSelected) {
        // 提取所有资产
        if (new BigNumber(withdrawAmount).eq(reserve.underlyingBalance)) {
          setAmount('-1');
        } else {
          setAmount(withdrawAmount.toString());
        }
      } else {
        if (v === '' || INPUT_NUMBER_RE.test(v)) {
          const filtered = v === '' ? undefined : filterNumber(v);
          if (filtered) {
            const maxAmount = new BigNumber(withdrawAmount || '0');
            const inputAmount = new BigNumber(filtered);
            if (inputAmount.gt(maxAmount)) {
              setAmount(withdrawAmount || '0');
            } else {
              setAmount(filtered);
            }
          } else {
            setAmount(undefined);
          }
        }
      }
    },
    [reserve.underlyingBalance, withdrawAmount]
  );

  const emptyAmount = useMemo(
    () => !withdrawAmount || isZeroAmount(withdrawAmount),
    [withdrawAmount]
  );
  const canSubmit = useMemo(() => {
    return (
      amount &&
      !isZeroAmount(amount) &&
      withdrawTxs.length > 0 &&
      currentAccount &&
      !isLoading &&
      (!isRisky || isChecked)
    );
  }, [
    amount,
    currentAccount,
    isChecked,
    isLoading,
    isRisky,
    withdrawTxs.length,
  ]);
  if (!reserve?.reserve?.symbol) return null;

  return (
    <div className="bg-r-neutral-bg-2 rounded-[8px] px-[20px] pt-[16px] pb-[16px] min-h-[600px] flex flex-col">
      <h2 className="text-[20px] leading-[24px] font-medium text-center text-r-neutral-title-1">
        {t('page.lending.withdrawDetail.actions')} {reserve.reserve.symbol}
      </h2>

      <div className="mt-16">
        <div className="flex items-center justify-between mb-8">
          <span className="text-[13px] leading-[15px] text-r-neutral-foot">
            {t('page.lending.popup.amount')}
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
                {t('page.lending.withdrawDetail.amountTitle')}
                {formatTokenAmount(withdrawAmount || '0')}
              </span>
              <button
                type="button"
                className={`
                  px-4 py-2 rounded-[2px] 
                  bg-rb-brand-light-1 
                  text-rb-brand-default font-medium text-[11px] leading-[11px] 
                  hover:bg-rb-brand-light-2 disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                onClick={() => handleChangeAmount('-1')}
                disabled={emptyAmount}
              >
                MAX
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-end min-w-0 gap-4">
            <LendingStyledInput
              value={amount ?? ''}
              onValueChange={handleChangeAmount}
              placeholder="0"
              className="text-right border-0 bg-transparent p-0 h-auto hover:border-r-0"
            />
            {amount && !isZeroAmount(amount) && (
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
        <WithdrawOverView
          reserve={reserve}
          userSummary={summary}
          afterHF={afterHF}
          amount={amount}
          afterSupply={afterSupply}
        />
      )}

      {canShowDirectSubmit &&
      chainInfo?.serverId &&
      !!amount &&
      !isZeroAmount(amount) ? (
        <div className="mt-16 px-16">
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

      <div className="mt-auto w-full">
        {isRisky && (
          <div className="mt-16 flex flex-col gap-12">
            <div className="flex items-center gap-8 py-8 px-10 rounded-[8px] bg-rb-red-light-1">
              <RcIconWarningCC
                viewBox="0 0 16 16"
                className="w-15 h-15 text-rb-red-default flex-shrink-0"
              />
              <span className="text-[14px] leading-[18px] font-medium text-rb-red-default flex-1">
                {t('page.lending.risk.withdrawWarning')}
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
            title={
              <>
                {t('page.lending.withdrawDetail.actions')}{' '}
                {reserve.reserve.symbol}
              </>
            }
            disabled={!canSubmit}
            loading={miniSignLoading}
            onConfirm={() => handleWithdraw()}
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
            onClick={() => handleWithdraw()}
          >
            {t('page.lending.withdrawDetail.actions')} {reserve.reserve.symbol}
          </Button>
        )}
      </div>
    </div>
  );
};
