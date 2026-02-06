import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, message, Select } from 'antd';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { parseUnits } from 'ethers/lib/utils';
import { isSameAddress } from '@/ui/utils';
import { useWallet } from '@/ui/utils/WalletContext';
import { useSceneAccount } from '@/ui/hooks/backgroundState/useAccount';
import { DisplayPoolReserveInfo, UserSummary } from '../../types';
import {
  calculateHFAfterRepay,
  calculateHFAfterRepayWithAToken,
} from '../../utils/hfUtils';
import { buildRepayTx, optimizedPath } from '../../utils/poolService';
import { REPAY_AMOUNT_MULTIPLIER } from '../../utils/constant';
import { RepayOverView } from './RepayOverView';
import { useLendingSummary } from '../../hooks';
import { useSelectedMarket } from '../../hooks/market';
import { usePoolDataProviderContract } from '../../hooks/pool';
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
import { displayGhoForMintableMarket } from '../../utils/supply';
import { ReactComponent as RcImgArrowDownCC } from '@/ui/assets/swap/arrow-down-cc.svg';
import { getTokenIcon } from '../../utils/tokenIcon';
import { LendingStyledInput } from '../StyledInput';
import stats from '@/stats';
import { LendingReportType } from '../../types/tx';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { isZeroAmount } from '../../utils/number';

const StyledSelect = styled(Select)`
  display: flex;
  align-items: center;
  background: var(--r-neutral-card2) !important;
  border-radius: 6px !important;
  .ant-select-selector {
    border: none !important;
    padding: 0 !important;
    padding: 4px 0 4px 6px !important;
    background: transparent !important;
    height: auto !important;
    box-shadow: none !important;
    width: fit-content;
  }

  .ant-select-selection-item {
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    line-height: 1 !important;
  }

  .ant-select-selection-placeholder {
    padding: 0 !important;
  }
  .ant-select-arrow {
    width: 16px;
    height: 16px;
    position: relative !important;
    margin-top: 0 !important;
  }

  &.ant-select-focused .ant-select-selector {
    border: none !important;
    box-shadow: none !important;
  }
`;

const SelectOptionWrapper = styled.div`
  display: flex;
  align-items: center;
  min-width: 80px;
  gap: 6px;
`;

const TokenIcon = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
`;

const TokenSymbolText = styled.span`
  font-size: 14px;
  line-height: 15px;
  color: var(--r-neutral-title-1, #13141a);
`;

type RepayModalProps = {
  visible: boolean;
  onCancel: () => void;
  reserve: DisplayPoolReserveInfo;
  userSummary: UserSummary | null;
};

export const RepayModal: React.FC<RepayModalProps> = ({
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
    iUserSummary: contextUserSummary,
  } = useLendingSummary();
  const { selectedMarketData, chainInfo, isMainnet } = useSelectedMarket();
  const { pools } = usePoolDataProviderContract();

  const { getContainer } = usePopupContainer();

  const summary = useMemo(() => userSummary ?? contextUserSummary, [
    userSummary,
    contextUserSummary,
  ]);

  const [isAtTokenRepay, setIsAtTokenRepay] = useState(false);

  const availableRepayTokens = useMemo(() => {
    const poolReserve = formattedPoolReservesAndIncentives.find((item) =>
      isSameAddress(item.underlyingAsset, reserve.underlyingAsset)
    );
    if (!poolReserve) {
      return [];
    }
    const tokens: Array<{
      address: string;
      symbol: string;
      aToken: boolean;
      decimals: number;
      balance: string;
    }> = [
      {
        address: poolReserve.underlyingAsset,
        symbol: poolReserve.symbol,
        aToken: false,
        decimals: poolReserve.decimals,
        balance: reserve.walletBalance || '0',
      },
    ];
    if (
      selectedMarketData?.v3 &&
      !displayGhoForMintableMarket({
        symbol: poolReserve.symbol,
        currentMarket: selectedMarketData?.market,
      })
    ) {
      tokens.push({
        address: poolReserve.aTokenAddress || '',
        symbol: `a${poolReserve.symbol}`,
        aToken: true,
        balance: reserve.underlyingBalance || '0',
        decimals: poolReserve.decimals,
      });
    }
    return tokens;
  }, [
    formattedPoolReservesAndIncentives,
    reserve,
    selectedMarketData?.market,
    selectedMarketData?.v3,
  ]);

  const selectedRepayToken = useMemo(() => {
    if (availableRepayTokens.length <= 1) {
      return availableRepayTokens[0];
    }
    if (isAtTokenRepay) {
      return availableRepayTokens[1];
    }
    return availableRepayTokens[0];
  }, [availableRepayTokens, isAtTokenRepay]);

  const [_amount, setAmount] = useState<string | undefined>(undefined);

  const [needApprove, setNeedApprove] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [miniSignLoading, setMiniSignLoading] = useState(false);
  const [repayTx, setRepayTx] = useState<Tx | null>(null);
  const [approveTxs, setApproveTxs] = useState<Tx[] | null>(null);

  const repayAmount = useMemo(() => {
    const balance = new BigNumber(selectedRepayToken?.balance || '0');
    const debt = new BigNumber(reserve.variableBorrows || '0');
    const miniAmount = balance.gte(debt) ? debt : balance;
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
    selectedRepayToken?.balance,
    reserve.variableBorrows,
    reserve.reserve.formattedPriceInMarketReferenceCurrency,
  ]);

  const amount = useMemo(() => {
    return _amount === '-1' ? repayAmount.amount : _amount;
  }, [_amount, repayAmount.amount]);

  const afterHF = useMemo(() => {
    if (!amount || isZeroAmount(amount) || !summary) {
      return undefined;
    }
    if (isAtTokenRepay) {
      return calculateHFAfterRepayWithAToken({
        user: summary,
        amount,
        debt: reserve.variableBorrows,
        usdPrice: reserve.reserve.formattedPriceInMarketReferenceCurrency,
      }).toString();
    }
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
    isAtTokenRepay,
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
    if (
      !amount ||
      isZeroAmount(amount) ||
      !currentAccount ||
      !selectedMarketData ||
      isAtTokenRepay
    ) {
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
        .integerValue(BigNumber.ROUND_UP)
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
    isAtTokenRepay,
  ]);

  const buildTransactions = useCallback(async () => {
    if (
      !amount ||
      isZeroAmount(amount) ||
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
        !isSameAddress(reserve.underlyingAsset, chainInfo.nativeTokenAddress) &&
        !isAtTokenRepay
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

      const targetPool = formattedPoolReservesAndIncentives.find((item) =>
        isSameAddress(item.underlyingAsset, reserve.underlyingAsset)
      );
      if (!targetPool?.aTokenAddress) {
        setRepayTx(null);
        setIsLoading(false);
        return;
      }

      const repayResult = await buildRepayTx({
        poolBundle: pools.poolBundle,
        amount:
          _amount === '-1'
            ? '-1'
            : parseUnits(amount, reserve.reserve.decimals).toString(),
        address: currentAccount.address,
        reserve: reserve.underlyingAsset,
        useOptimizedPath: optimizedPath(selectedMarketData.chainId),
        repayWithATokens: isAtTokenRepay,
      });
      delete repayResult.gasLimit;

      setRepayTx(({
        ...repayResult,
        chainId: chainInfo.id,
      } as unknown) as Tx);
    } catch (error) {
      console.error('Build transactions error:', error);
      message.error('Something error');
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
    isAtTokenRepay,
    formattedPoolReservesAndIncentives,
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
      setIsAtTokenRepay(false);
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
        isZeroAmount(amount) ||
        !chainInfo
      ) {
        return;
      }
      const allTxs: Tx[] = [...(approveTxs || []), repayTx];
      if (!allTxs.length) {
        message.info(t('page.lending.submitted') || 'Please retry');
        return;
      }
      const report = (lastHash: string) => {
        const poolReserve = formattedPoolReservesAndIncentives.find((item) =>
          isSameAddress(item.underlyingAsset, reserve.underlyingAsset)
        );
        const bgCurrency = new BigNumber(
          poolReserve?.formattedPriceInMarketReferenceCurrency || '0'
        );
        const usdValue = poolReserve
          ? new BigNumber(amount || '0').multipliedBy(bgCurrency).toString()
          : '0';

        stats.report('aaveInternalTx', {
          tx_type: isAtTokenRepay
            ? LendingReportType.RepayWithAToken
            : LendingReportType.Repay,
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
              txs: allTxs,
              getContainer,
              ga: {
                category: 'Lending',
                source: 'Lending',
                trigger: 'Repay',
              },
            });
            const hash = hashes[hashes.length - 1];
            if (hash) {
              report(hash);
              message.success(
                `${t('page.lending.repayDetail.actions')} ${t(
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
            await handleRepay(true);
            return;
          } finally {
            setMiniSignLoading(false);
          }
          return;
        }

        setIsLoading(true);
        let lastHash: string = '';
        for (let i = 0; i < allTxs.length; i++) {
          const tx = allTxs[i];
          lastHash = await wallet.sendRequest(
            {
              method: 'eth_sendTransaction',
              params: [tx],
              $ctx: {
                ga: {
                  category: 'Lending',
                  source: 'Lending',
                  trigger: 'Repay',
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
          `${t('page.lending.repayDetail.actions')} ${t(
            'page.lending.submitted'
          )}`
        );
        setAmount(undefined);
        onCancel();
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
      chainInfo,
      approveTxs,
      t,
      formattedPoolReservesAndIncentives,
      isAtTokenRepay,
      reserve.underlyingAsset,
      canShowDirectSubmit,
      onCancel,
      openDirect,
      getContainer,
      wallet,
    ]
  );

  const onAmountChange = useCallback(
    (v: string) => {
      const maxSelected = v === '-1';
      if (maxSelected) {
        // 还清所有债务
        if (repayAmount.isDebtUp) {
          setAmount('-1');
        } else {
          setAmount(repayAmount.amount?.toString() || '0');
        }
      } else {
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
      }
    },
    [repayAmount.amount, repayAmount.isDebtUp]
  );

  const emptyAmount = useMemo(
    () => !repayAmount.amount || isZeroAmount(repayAmount.amount),
    [repayAmount.amount]
  );
  const canSubmit = useMemo(() => {
    return (
      amount && !isZeroAmount(amount) && repayTx && currentAccount && !isLoading
    );
  }, [amount, currentAccount, isLoading, repayTx]);

  if (!reserve?.reserve?.symbol) return null;

  return (
    <div className="bg-r-neutral-bg-2 rounded-[8px] px-[20px] pt-[16px] pb-[16px] min-h-[600px] flex flex-col">
      <h2 className="text-[20px] leading-[24px] font-medium text-center text-r-neutral-title-1">
        {t('page.lending.repayDetail.actions')} {reserve.reserve.symbol}
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
              {availableRepayTokens.length > 1 &&
              !!reserve.underlyingBalance ? (
                <StyledSelect
                  value={isAtTokenRepay ? 'aToken' : 'underlying'}
                  onChange={(value) => setIsAtTokenRepay(value === 'aToken')}
                  suffixIcon={
                    <RcImgArrowDownCC
                      viewBox="0 0 16 16"
                      className="w-16 h-16 text-r-neutral-foot"
                    />
                  }
                  options={availableRepayTokens.map((token) => ({
                    label: (
                      <SelectOptionWrapper>
                        <TokenIcon
                          src={getTokenIcon(token.symbol)}
                          alt={token.symbol}
                        />
                        <TokenSymbolText>{token.symbol}</TokenSymbolText>
                      </SelectOptionWrapper>
                    ),
                    value: token.aToken ? 'aToken' : 'underlying',
                  }))}
                />
              ) : (
                <span className="text-[20px] leading-[20px] font-medium text-r-neutral-title-1">
                  {selectedRepayToken?.symbol || reserve.reserve.symbol}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[13px] leading-[16px] text-r-neutral-foot">
                {t('page.lending.repayDetail.amountTitle')}
                {formatTokenAmount(repayAmount.amount || '0')}(
                {formatUsdValue(Number(repayAmount.usdValue))})
              </span>
              <button
                type="button"
                className={`
                  px-4 py-2 rounded-[2px] 
                  bg-rb-brand-light-1 
                  text-rb-brand-default font-medium text-[11px] leading-[11px] 
                  hover:bg-rb-brand-light-2 disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                onClick={() => onAmountChange('-1')}
                disabled={emptyAmount}
              >
                MAX
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-end min-w-0 gap-4">
            <LendingStyledInput
              value={amount ?? ''}
              onValueChange={onAmountChange}
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
        <RepayOverView
          reserve={reserve}
          userSummary={summary}
          amount={amount}
          afterRepayAmount={afterRepayAmount}
          afterRepayUsdValue={afterRepayUsdValue}
          afterHF={afterHF}
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
    </div>
  );
};
