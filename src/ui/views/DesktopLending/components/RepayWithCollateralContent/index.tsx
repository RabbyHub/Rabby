import { ChainId } from '@aave/contract-helpers';
import { normalizeBN, valueToBigNumber } from '@aave/math-utils';
import { Button, message } from 'antd';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { OptimalRate } from '@paraswap/sdk';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { ethers, PopulatedTransaction } from 'ethers';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { ETH_USDT_CONTRACT } from '@/constant';
import { DirectSignToConfirmBtn } from '@/ui/component/ToConfirmButton';
import { useSceneAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { useDebouncedValue } from '@/ui/hooks/useDebounceValue';
import { ReactComponent as RcIconSwitchCC } from '@/ui/assets/bridge/switch-arrow-cc.svg';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/lending/warning-2.svg';
import { ReactComponent as RcImgArrowDownCC } from '@/ui/assets/swap/arrow-down-cc.svg';
import { ReactComponent as RcIconLoading } from '@/ui/assets/swap/quote-circle-loading-cc.svg';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { DirectSignGasInfo } from '@/ui/views/Bridge/Component/BridgeShowMore';
import { BridgeSlippage } from '@/ui/views/Bridge/Component/BridgeSlippage';
import { formatTokenAmount } from '@/ui/utils/number';
import { isSameAddress, noop } from '@/ui/utils';
import { useWallet } from '@/ui/utils/WalletContext';
import stats from '@/stats';

import { getParaswap } from '../../config/paraswap';
import { useLendingSummary } from '../../hooks';
import { useSelectedMarket } from '../../hooks/market';
import { usePoolDataProviderContract } from '../../hooks/pool';
import { DisplayPoolReserveInfo, UserSummary } from '../../types';
import { ParaswapRatesType, SwappableToken, SwapType } from '../../types/swap';
import { LendingReportType } from '../../types/tx';
import {
  APP_CODE_LENDING_REPAY_WITH_COLLATERAL,
  LIQUIDATION_SAFETY_THRESHOLD,
} from '../../utils/constant';
import {
  buildRepayWithCollateralTx,
  InterestRate,
} from '../../utils/poolService';
import { getCollateralTokens, getFromToken } from '../../utils/swap';
import { LendingStyledInput } from '../StyledInput';
import { StyledCheckbox } from '../BorrowModal';
import SymbolIcon from '../SymbolIcon';
import CollateralTokenPopup from './CollateralTokenPopup';
import RepayWithCollateralOverview from './Overview';
import { getParaswapSellRates } from './paraswap';
import {
  useFormatValues,
  useHFForRepayWithCollateral,
  useRepayWithCollateralSlippage,
  useSwapReserves,
} from './hook';
import {
  calculateSignedAmount,
  DEFAULT_REPAY_WITH_COLLATERAL_SLIPPAGE,
  formatTx,
  getPriceImpactData,
  getToAmountAfterSlippage,
  maxInputAmountWithSlippage,
} from './utils';

const ArrowLoadingWrapper = styled.div`
  @keyframes loading-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-spin {
    animation: loading-spin 0.5s linear infinite !important;
  }
`;

type RepayWithCollateralContentProps = {
  embedded?: boolean;
  visible: boolean;
  onCancel: () => void;
  reserve: DisplayPoolReserveInfo;
  userSummary: UserSummary | null;
};

export const RepayWithCollateralContent: React.FC<RepayWithCollateralContentProps> = ({
  embedded = false,
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
    displayPoolReserves,
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

  const repayToken = useMemo(() => {
    const matchedReserve = formattedPoolReservesAndIncentives.find((item) =>
      isSameAddress(item.underlyingAsset, reserve.underlyingAsset)
    );

    if (!matchedReserve || !chainInfo?.id) {
      return undefined;
    }

    return getFromToken(
      matchedReserve,
      chainInfo.id,
      reserve.variableBorrows || '0'
    );
  }, [
    chainInfo?.id,
    formattedPoolReservesAndIncentives,
    reserve.underlyingAsset,
    reserve.variableBorrows,
  ]);

  const effectiveRepayToken = useMemo<SwappableToken>(
    () =>
      repayToken || {
        addressToSwap: reserve.underlyingAsset,
        addressForUsdPrice: reserve.underlyingAsset,
        underlyingAddress: reserve.underlyingAsset,
        decimals: reserve.reserve.decimals,
        symbol: reserve.reserve.symbol,
        name: reserve.reserve.symbol,
        balance: reserve.variableBorrows || '0',
        chainId: chainInfo?.id || selectedMarketData?.chainId || 0,
        usdPrice:
          reserve.reserve.formattedPriceInMarketReferenceCurrency || '0',
      },
    [
      chainInfo?.id,
      repayToken,
      reserve.reserve.decimals,
      reserve.reserve.formattedPriceInMarketReferenceCurrency,
      reserve.reserve.symbol,
      reserve.underlyingAsset,
      reserve.variableBorrows,
      selectedMarketData?.chainId,
    ]
  );

  const collateralTokenEntries: {
    displayReserve?: DisplayPoolReserveInfo;
    token: SwappableToken;
  }[] = useMemo(() => {
    if (!summary || !chainInfo?.id) {
      return [];
    }

    return getCollateralTokens(summary, chainInfo.id)
      .filter(
        (item) =>
          !isSameAddress(item.underlyingAddress, reserve.underlyingAsset)
      )
      .map((item) => {
        const displayReserve = displayPoolReserves.find((pool) =>
          isSameAddress(pool.underlyingAsset, item.underlyingAddress)
        );

        return {
          displayReserve,
          token: {
            ...item,
            underlyingUsdValue: displayReserve?.underlyingBalanceUSD || '0',
            walletBalanceUSD: displayReserve?.walletBalanceUSD,
            totalBorrowsUSD: displayReserve?.totalBorrowsUSD,
          },
        };
      })
      .sort((a, b) => {
        if (
          Number(a.token.underlyingUsdValue) === 0 &&
          Number(b.token.underlyingUsdValue) === 0
        ) {
          return Number(b.token.balance) - Number(a.token.balance);
        }

        return (
          Number(b.token.underlyingUsdValue || 0) -
          Number(a.token.underlyingUsdValue || 0)
        );
      });
  }, [chainInfo?.id, displayPoolReserves, reserve.underlyingAsset, summary]);

  const availableCollateralTokens = useMemo(
    () => collateralTokenEntries.map((item) => item.token),
    [collateralTokenEntries]
  );

  const hasZeroLtvCollateral = useMemo(
    () =>
      collateralTokenEntries.some(
        (item) =>
          item.displayReserve?.usageAsCollateralEnabledOnUser &&
          item.displayReserve?.reserve.baseLTVasCollateral === '0'
      ),
    [collateralTokenEntries]
  );

  const collateralPopupOptions = useMemo(
    () =>
      hasZeroLtvCollateral
        ? collateralTokenEntries.filter(
            (item) => item.displayReserve?.reserve.baseLTVasCollateral === '0'
          )
        : collateralTokenEntries,
    [collateralTokenEntries, hasZeroLtvCollateral]
  );

  const defaultCollateralToken = useMemo(() => {
    const hasZeroLtvCollateral = collateralTokenEntries.some(
      (item) =>
        item.displayReserve?.usageAsCollateralEnabledOnUser &&
        item.displayReserve?.reserve.baseLTVasCollateral === '0'
    );

    if (hasZeroLtvCollateral) {
      return collateralTokenEntries.find(
        (item) => item.displayReserve?.reserve.baseLTVasCollateral === '0'
      )?.token;
    }

    return collateralTokenEntries[0]?.token;
  }, [collateralTokenEntries]);

  const [selectedCollateralToken, setSelectedCollateralToken] = useState<
    SwappableToken | undefined
  >(defaultCollateralToken);
  const [repayAmount, setRepayAmount] = useState('');
  const debouncedRepayAmount = useDebouncedValue(repayAmount || '0', 400);
  const [collateralAmount, setCollateralAmount] = useState('');
  const [quote, setQuote] = useState<ParaswapRatesType | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [miniSignLoading, setMiniSignLoading] = useState(false);
  const [riskChecked, setRiskChecked] = useState(false);
  const [collateralPopupVisible, setCollateralPopupVisible] = useState(false);
  const [noQuote, setNoQuote] = useState(false);
  const [quoteRefreshId, setQuoteRefreshId] = useState(0);
  const [currentTxs, setCurrentTxs] = useState<Tx[]>([]);

  const [swapRate, setSwapRate] = useState<{
    optimalRateData?: OptimalRate;
    inputAmount?: string;
    outputAmount?: string;
    slippageBps?: number;
    maxInputAmountWithSlippage?: string;
  }>({});

  const lastQuoteParamsRef = useRef<{
    rawAmount: string;
    toToken?: string;
  }>();
  const quoteExpiredTimerRef = useRef<NodeJS.Timeout>();
  const enableQuoteAutoRefreshRef = useRef(false);

  const {
    collateralUsdValue,
    debtBalance,
    debtBalanceToDisplay,
    debtUsdValue,
  } = useFormatValues({
    collateralToken: selectedCollateralToken,
    repayToken: effectiveRepayToken,
    collateralAmount,
    repayAmount: debouncedRepayAmount,
  });

  const {
    collateralReserve,
    repayDisplayReserve,
    repayReserve,
    isSameToken,
  } = useSwapReserves({
    collateralToken: selectedCollateralToken,
    repayToken: effectiveRepayToken,
  });

  const {
    slippage,
    setSlippage,
    autoSlippage,
    setAutoSlippage,
    isCustomSlippage,
    setIsCustomSlippage,
    displaySlippage,
    slippageBpsRef,
  } = useRepayWithCollateralSlippage({
    collateralToken: selectedCollateralToken,
    repayToken: effectiveRepayToken,
    setSwapRate,
  });

  const collateralAmountAfterSlippage = useMemo(
    () =>
      getToAmountAfterSlippage({
        inputAmount: collateralAmount || '0',
        slippage: Number(slippage || 0) * 100,
      }),
    [collateralAmount, slippage]
  );

  const priceImpactData = useMemo(
    () =>
      getPriceImpactData({
        fromToken: effectiveRepayToken,
        toToken: selectedCollateralToken,
        fromAmount: debouncedRepayAmount,
        toAmount: collateralAmountAfterSlippage,
      }),
    [
      collateralAmountAfterSlippage,
      debouncedRepayAmount,
      effectiveRepayToken,
      selectedCollateralToken,
    ]
  );

  const collateralNotEnough = useMemo(() => {
    if (!selectedCollateralToken) {
      return false;
    }

    return new BigNumber(collateralAmountAfterSlippage).gt(
      selectedCollateralToken.balance || '0'
    );
  }, [collateralAmountAfterSlippage, selectedCollateralToken]);

  const {
    currentHF,
    afterSwapInfo,
    isHFLow,
    isLiquidatable,
  } = useHFForRepayWithCollateral({
    collateralToken: selectedCollateralToken,
    repayToken: effectiveRepayToken,
    collateralAmount: collateralAmountAfterSlippage,
    repayAmount: debouncedRepayAmount,
    userSummary: summary,
  });

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

  const clearQuoteExpiredTimer = useCallback(() => {
    if (quoteExpiredTimerRef.current) {
      clearTimeout(quoteExpiredTimerRef.current);
    }
  }, []);

  useEffect(
    () => () => {
      clearQuoteExpiredTimer();
    },
    [clearQuoteExpiredTimer]
  );

  useEffect(() => {
    if (!visible) {
      clearQuoteExpiredTimer();
      enableQuoteAutoRefreshRef.current = false;
      setSelectedCollateralToken(defaultCollateralToken);
      setRepayAmount('');
      setCollateralAmount('');
      setQuote(null);
      setSwapRate({});
      setRiskChecked(false);
      setCollateralPopupVisible(false);
      setNoQuote(false);
      setCurrentTxs([]);
      setIsQuoteLoading(false);
      setIsLoading(false);
      setMiniSignLoading(false);
      return;
    }

    setSelectedCollateralToken((current) => {
      if (
        current &&
        availableCollateralTokens.some((item) =>
          isSameAddress(item.addressToSwap, current.addressToSwap)
        )
      ) {
        return current;
      }

      return defaultCollateralToken;
    });
  }, [
    availableCollateralTokens,
    clearQuoteExpiredTimer,
    defaultCollateralToken,
    visible,
  ]);

  useEffect(() => {
    setRiskChecked(false);
  }, [displaySlippage, isHFLow, priceImpactData.showConfirmation]);

  const handleRepayAmountChange = useCallback(
    (value: string) => {
      if (!repayToken) {
        return;
      }

      const normalizedValue = value === '' ? '' : value;
      if (normalizedValue === '') {
        setRepayAmount('');
        return;
      }

      const amountBn = new BigNumber(normalizedValue || 0);
      if (amountBn.lte(0)) {
        setRepayAmount(normalizedValue);
        return;
      }

      const cappedAmount = amountBn.gt(debtBalance.toString(10))
        ? debtBalance.toString(10)
        : normalizedValue;
      setRepayAmount(cappedAmount);
    },
    [debtBalance, repayToken]
  );

  const handleSelectCollateral = useCallback(
    (value: string) => {
      const nextToken = availableCollateralTokens.find((item) =>
        isSameAddress(item.addressToSwap, value)
      );

      setSelectedCollateralToken(nextToken);
      setCollateralAmount('');
      setQuote(null);
      setSwapRate({});
      setCurrentTxs([]);
      setNoQuote(false);
      setIsQuoteLoading(false);
    },
    [availableCollateralTokens]
  );

  useEffect(() => {
    let cancelled = false;

    const fetchQuote = async () => {
      const resetQuote = () => {
        setCollateralAmount('');
        setQuote(null);
        setSwapRate({});
        setIsQuoteLoading(false);
        setNoQuote(false);
        enableQuoteAutoRefreshRef.current = false;
        clearQuoteExpiredTimer();
      };

      if (!visible || !repayToken) {
        resetQuote();
        return;
      }

      setIsQuoteLoading(true);

      if (
        !selectedCollateralToken ||
        isSameToken ||
        !debouncedRepayAmount ||
        !currentAccount?.address ||
        !collateralReserve?.underlyingAsset ||
        !collateralReserve?.decimals
      ) {
        resetQuote();
        return;
      }

      const amountBn = new BigNumber(debouncedRepayAmount || 0);
      if (amountBn.lte(0)) {
        resetQuote();
        return;
      }

      try {
        const rawAmount = normalizeBN(
          debouncedRepayAmount,
          -1 * repayToken.decimals
        ).toFixed(0);

        const quoteRes = await getParaswapSellRates({
          swapType: SwapType.RepayWithCollateral,
          chainId: repayToken.chainId,
          amount: rawAmount,
          srcToken: collateralReserve.underlyingAsset,
          srcDecimals: collateralReserve.decimals,
          destToken: repayToken.underlyingAddress,
          destDecimals: repayToken.decimals,
          user: currentAccount.address,
          side: 'buy',
          appCode: APP_CODE_LENDING_REPAY_WITH_COLLATERAL,
          options: {
            partner: APP_CODE_LENDING_REPAY_WITH_COLLATERAL,
          },
          invertedQuoteRoute: true,
        });

        if (cancelled || !quoteRes) {
          if (!cancelled) {
            setNoQuote(true);
            enableQuoteAutoRefreshRef.current = false;
            clearQuoteExpiredTimer();
          }
          return;
        }

        const destAmount = normalizeBN(
          quoteRes.destSpotAmount,
          quoteRes.destDecimals
        ).toFixed();

        lastQuoteParamsRef.current = {
          rawAmount,
          toToken: selectedCollateralToken.addressToSwap,
        };

        setQuote(quoteRes);
        setSwapRate({
          optimalRateData: quoteRes.optimalRateData,
          inputAmount: quoteRes.destSpotAmount,
          outputAmount: rawAmount,
          slippageBps: slippageBpsRef.current,
          maxInputAmountWithSlippage: maxInputAmountWithSlippage(
            quoteRes.destSpotAmount,
            slippageBpsRef.current
          ),
        });
        setCollateralAmount(destAmount);
        setNoQuote(false);
        enableQuoteAutoRefreshRef.current = true;
        clearQuoteExpiredTimer();
        quoteExpiredTimerRef.current = setTimeout(() => {
          if (enableQuoteAutoRefreshRef.current) {
            setQuoteRefreshId((prev) => prev + 1);
          }
        }, 30 * 1000);
      } catch (error) {
        if (!cancelled) {
          setCollateralAmount('');
          setQuote(null);
          setSwapRate({});
          setNoQuote(true);
          enableQuoteAutoRefreshRef.current = false;
          clearQuoteExpiredTimer();
        }
      } finally {
        if (!cancelled) {
          setIsQuoteLoading(false);
        }
      }
    };

    fetchQuote();

    return () => {
      cancelled = true;
    };
  }, [
    clearQuoteExpiredTimer,
    collateralReserve?.decimals,
    collateralReserve?.underlyingAsset,
    currentAccount?.address,
    debouncedRepayAmount,
    isSameToken,
    quoteRefreshId,
    repayToken,
    selectedCollateralToken,
    slippageBpsRef,
    visible,
  ]);

  const buildRepayWithCollateralTxs = useCallback(async (): Promise<Tx[]> => {
    if (
      !currentAccount ||
      !selectedCollateralToken ||
      !repayToken ||
      !quote ||
      !swapRate.optimalRateData ||
      !selectedMarketData?.addresses?.REPAY_WITH_COLLATERAL_ADAPTER ||
      !pools?.pool ||
      !repayReserve ||
      !collateralReserve ||
      !collateralReserve.aTokenAddress ||
      !chainInfo ||
      collateralNotEnough
    ) {
      return [];
    }

    const rawAmount = normalizeBN(
      debouncedRepayAmount,
      -1 * repayToken.decimals
    ).toFixed(0);

    if (
      !lastQuoteParamsRef.current ||
      lastQuoteParamsRef.current.rawAmount !== rawAmount ||
      lastQuoteParamsRef.current.toToken !==
        selectedCollateralToken.addressToSwap
    ) {
      throw new Error('quote-outdated');
    }

    const safeAmountToRepayAll = valueToBigNumber(debtBalance.toString(10))
      .plus(
        valueToBigNumber(debtBalance.toString(10))
          .multipliedBy(repayReserve.variableBorrowAPY)
          .dividedBy(360 * 24 * 2)
      )
      .decimalPlaces(repayToken.decimals, BigNumber.ROUND_CEIL)
      .toFixed(repayToken.decimals);

    const { paraswap, feeTarget } = getParaswap(repayToken.chainId as ChainId);

    const slippageBps =
      swapRate.slippageBps ?? DEFAULT_REPAY_WITH_COLLATERAL_SLIPPAGE;

    const txParams = await paraswap.buildTx(
      {
        destAmount: rawAmount,
        destDecimals: repayToken.decimals,
        destToken: repayToken.underlyingAddress,
        isDirectFeeTransfer: true,
        partnerAddress: feeTarget,
        slippage: slippageBps,
        priceRoute: swapRate.optimalRateData,
        srcToken: selectedCollateralToken.underlyingAddress,
        srcDecimals: selectedCollateralToken.decimals,
        userAddress: currentAccount.address,
        takeSurplus: true,
      },
      {
        ignoreChecks: true,
      }
    );

    const swapCallData = txParams.data;
    const augustus = txParams.to;
    const isMaxSelected = new BigNumber(debouncedRepayAmount || 0).gte(
      debtBalance.toString(10)
    );
    const rawRepayWithAmount =
      swapRate.maxInputAmountWithSlippage ||
      swapRate.inputAmount ||
      swapRate.optimalRateData.srcAmount ||
      '0';
    const useFlashLoan =
      currentHF !== '-1' &&
      valueToBigNumber(currentHF || 0)
        .minus(
          valueToBigNumber(afterSwapInfo?.hfEffectOfFromAmount?.toString() || 0)
        )
        .lt(LIQUIDATION_SAFETY_THRESHOLD);

    const repayWithCollateralTx = await buildRepayWithCollateralTx({
      pool: pools.pool,
      address: currentAccount.address,
      fromUnderlyingAsset: selectedCollateralToken.underlyingAddress,
      fromATokenAddress: collateralReserve.aTokenAddress || '',
      toUnderlyingAsset: repayToken.underlyingAddress,
      repayAmount: isMaxSelected ? safeAmountToRepayAll : debouncedRepayAmount,
      repayWithAmount: new BigNumber(collateralAmount || '0')
        .multipliedBy(1 + slippageBps / 10000)
        .decimalPlaces(selectedCollateralToken.decimals, BigNumber.ROUND_CEIL)
        .toFixed(selectedCollateralToken.decimals),
      repayAllDebt: isMaxSelected,
      rateMode: InterestRate.Variable,
      useFlashLoan,
      swapCallData,
      augustus,
    });

    const txs: Tx[] = [];

    if (
      !isSameAddress(
        selectedCollateralToken.addressToSwap,
        chainInfo.nativeTokenAddress || ''
      )
    ) {
      const aTokenAddress = selectedCollateralToken.addressToSwap;
      const approveAmount = calculateSignedAmount(rawRepayWithAmount);
      const allowance = await wallet.getERC20Allowance(
        chainInfo.serverId,
        aTokenAddress,
        selectedMarketData.addresses.REPAY_WITH_COLLATERAL_ADAPTER
      );
      const requiredAmount = new BigNumber(approveAmount).toString();
      const actualNeedApprove = !new BigNumber(allowance || '0').gte(
        requiredAmount
      );

      if (actualNeedApprove) {
        const shouldTwoStepApprove =
          isMainnet &&
          isSameAddress(
            selectedCollateralToken.underlyingAddress,
            ETH_USDT_CONTRACT
          ) &&
          Number(allowance) !== 0 &&
          !new BigNumber(allowance || '0').gte(requiredAmount);

        if (shouldTwoStepApprove) {
          const zeroResp = await wallet.approveToken(
            chainInfo.serverId,
            aTokenAddress,
            selectedMarketData.addresses.REPAY_WITH_COLLATERAL_ADAPTER,
            0,
            undefined,
            undefined,
            undefined,
            true,
            currentAccount
          );
          const zeroTx = (zeroResp as { params?: [Tx] })?.params?.[0];
          if (zeroTx) {
            txs.push(zeroTx);
          }
        }

        const approveResp = await wallet.approveToken(
          chainInfo.serverId,
          aTokenAddress,
          selectedMarketData.addresses.REPAY_WITH_COLLATERAL_ADAPTER,
          approveAmount,
          undefined,
          undefined,
          undefined,
          true,
          currentAccount
        );
        const approveTx = (approveResp as { params?: [Tx] })?.params?.[0];
        if (approveTx) {
          txs.push(approveTx);
        }
      }
    }

    const actionTx = repayWithCollateralTx.find(
      (item) => item.txType === 'DLP_ACTION'
    );
    if (!actionTx) {
      throw new Error('action-tx-not-found');
    }

    let tx;
    try {
      tx = await actionTx.tx();
    } catch (error) {
      if ((error as { transaction?: PopulatedTransaction }).transaction) {
        tx = (error as { transaction: PopulatedTransaction }).transaction;
      }
    }

    if (!tx) {
      throw new Error('repay-tx-not-found');
    }

    const formattedRepayTx = formatTx(
      {
        to: tx.to,
        from: tx.from,
        data: tx.data,
        value: tx.value ? ethers.BigNumber.from(tx.value) : undefined,
      },
      currentAccount.address,
      repayToken.chainId
    );

    if (!formattedRepayTx) {
      throw new Error('invalid-repay-tx');
    }

    txs.push(formattedRepayTx);

    return txs;
  }, [
    afterSwapInfo?.hfEffectOfFromAmount,
    chainInfo,
    collateralAmount,
    collateralNotEnough,
    collateralReserve,
    currentAccount,
    currentHF,
    debtBalance,
    debouncedRepayAmount,
    isMainnet,
    pools?.pool,
    quote,
    repayReserve,
    repayToken,
    selectedCollateralToken,
    selectedMarketData,
    swapRate.inputAmount,
    swapRate.maxInputAmountWithSlippage,
    swapRate.optimalRateData,
    swapRate.slippageBps,
    wallet,
  ]);

  useEffect(() => {
    let cancelled = false;

    const buildTransactions = async () => {
      if (
        !visible ||
        !currentAccount ||
        !selectedCollateralToken ||
        !quote ||
        !swapRate.optimalRateData ||
        !selectedMarketData?.addresses?.REPAY_WITH_COLLATERAL_ADAPTER ||
        !pools?.pool ||
        !repayReserve ||
        !collateralReserve ||
        !collateralReserve.aTokenAddress ||
        !debouncedRepayAmount ||
        new BigNumber(debouncedRepayAmount).lte(0) ||
        collateralNotEnough
      ) {
        if (!cancelled) {
          setCurrentTxs([]);
        }
        return;
      }

      try {
        const txs = await buildRepayWithCollateralTxs();
        if (!cancelled) {
          setCurrentTxs(txs.filter(Boolean));
        }
      } catch (error) {
        if (!cancelled) {
          setCurrentTxs([]);
        }
      }
    };

    buildTransactions();

    return () => {
      cancelled = true;
    };
  }, [
    buildRepayWithCollateralTxs,
    collateralNotEnough,
    collateralReserve,
    currentAccount,
    debouncedRepayAmount,
    pools?.pool,
    quote,
    repayReserve,
    selectedCollateralToken,
    selectedMarketData?.addresses?.REPAY_WITH_COLLATERAL_ADAPTER,
    swapRate.optimalRateData,
    visible,
  ]);

  useEffect(() => {
    if (!currentAccount || !canShowDirectSubmit) {
      prefetch({ txs: [] });
      return;
    }

    closeSign();

    if (
      !visible ||
      !currentTxs.length ||
      collateralNotEnough ||
      isLiquidatable
    ) {
      prefetch({ txs: [] });
      return;
    }

    prefetch({
      txs: currentTxs,
      ga: {
        category: 'Lending',
        source: 'Lending',
        trigger: 'RepayWithCollateral',
      },
    }).catch((error) => {
      if (error !== MINI_SIGN_ERROR.PREFETCH_FAILURE) {
        console.error('lending repay with collateral prefetch error', error);
      }
    });

    return () => {
      closeSign();
      prefetch({ txs: [] });
    };
  }, [
    canShowDirectSubmit,
    closeSign,
    collateralNotEnough,
    currentAccount,
    currentTxs,
    isLiquidatable,
    prefetch,
    visible,
  ]);

  const handleRepay = useCallback(
    async (forceFullSign?: boolean) => {
      if (
        !currentAccount ||
        !repayToken ||
        !selectedCollateralToken ||
        !currentTxs.length ||
        !chainInfo
      ) {
        return;
      }

      const report = (lastHash: string) => {
        const usdValue = new BigNumber(debouncedRepayAmount || '0')
          .multipliedBy(
            new BigNumber(
              repayReserve?.formattedPriceInMarketReferenceCurrency ||
                repayToken.usdPrice ||
                '0'
            )
          )
          .toString();

        stats.report('aaveInternalTx', {
          tx_type: LendingReportType.RepayWithCollateral,
          chain: chainInfo.serverId || '',
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
              txs: currentTxs,
              getContainer,
              ga: {
                category: 'Lending',
                source: 'Lending',
                trigger: 'RepayWithCollateral',
              },
            });
            const hash = hashes[hashes.length - 1];

            if (hash) {
              report(hash);
              message.success(
                `${t('page.lending.repayWithCollateral.action.title', {
                  collateral: selectedCollateralToken.symbol,
                })} ${t('page.lending.submitted')}`
              );
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
        let lastHash = '';
        for (const tx of currentTxs) {
          lastHash = await wallet.sendRequest(
            {
              method: 'eth_sendTransaction',
              params: [tx],
              $ctx: {
                ga: {
                  category: 'Lending',
                  source: 'Lending',
                  trigger: 'RepayWithCollateral',
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
          `${t('page.lending.repayWithCollateral.action.title', {
            collateral: selectedCollateralToken.symbol,
          })} ${t('page.lending.submitted')}`
        );
        onCancel();
      } catch (error) {
        console.error('repay with collateral error', error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      canShowDirectSubmit,
      chainInfo,
      currentAccount,
      currentTxs,
      debouncedRepayAmount,
      getContainer,
      onCancel,
      openDirect,
      repayReserve?.formattedPriceInMarketReferenceCurrency,
      repayToken,
      selectedCollateralToken,
      t,
      wallet,
    ]
  );

  const isSlippageHigh = useMemo(
    () => new BigNumber(displaySlippage || 0).gt(30),
    [displaySlippage]
  );

  const isRisky = useMemo(
    () => isSlippageHigh || priceImpactData.showConfirmation || isHFLow,
    [isHFLow, isSlippageHigh, priceImpactData.showConfirmation]
  );

  const riskDesc = useMemo(() => {
    if (isHFLow) {
      return t('page.lending.debtSwap.lpRiskWarning');
    }
    if (priceImpactData.showConfirmation) {
      return t('page.lending.debtSwap.priceImpactTips', {
        lostValue: `${(priceImpactData.lostValue * 100).toFixed(1)}%`,
      });
    }

    return t(
      'page.swap.transaction-might-be-frontrun-because-of-high-slippage-tolerance'
    );
  }, [isHFLow, priceImpactData.lostValue, priceImpactData.showConfirmation, t]);

  const canRepay = useMemo(() => {
    return (
      !!repayToken &&
      !!selectedCollateralToken &&
      !isSameToken &&
      !!quote &&
      !!debouncedRepayAmount &&
      !collateralNotEnough &&
      new BigNumber(debouncedRepayAmount).gt(0) &&
      new BigNumber(debouncedRepayAmount).lte(debtBalance.toString(10)) &&
      !isQuoteLoading
    );
  }, [
    collateralNotEnough,
    debtBalance,
    debouncedRepayAmount,
    isQuoteLoading,
    isSameToken,
    quote,
    repayToken,
    selectedCollateralToken,
  ]);

  const canSubmit = useMemo(
    () =>
      canRepay &&
      !!currentAccount &&
      !!currentTxs.length &&
      !isLoading &&
      !miniSignLoading,
    [canRepay, currentAccount, currentTxs.length, isLoading, miniSignLoading]
  );

  const buttonDisabled = useMemo(
    () =>
      !canSubmit ||
      (isRisky && !riskChecked) ||
      isLiquidatable ||
      collateralNotEnough,
    [canSubmit, collateralNotEnough, isLiquidatable, isRisky, riskChecked]
  );

  if (!reserve?.reserve?.symbol || !repayToken) {
    return null;
  }

  return (
    <div
      className={
        embedded
          ? 'mt-16 flex min-h-0 flex-1 flex-col'
          : 'flex min-h-[600px] flex-col rounded-[8px] bg-r-neutral-bg-2 px-[20px] pt-[16px] pb-[16px]'
      }
    >
      <div className="flex-1 overflow-y-auto">
        <div className="mb-8 text-[13px] leading-[15px] text-r-neutral-foot">
          {t('page.lending.popup.amount')}
        </div>

        <div className="relative overflow-hidden rounded-[8px] bg-rb-neutral-card-1">
          <div className="border-b-[0.5px] border-rb-neutral-line px-16 pt-16 pb-18">
            <div className="mb-16 text-[13px] leading-[15px] font-medium text-r-neutral-title-1">
              {t('page.lending.repayWithCollateral.toRepay')}
            </div>
            <div className="flex items-start justify-between gap-12">
              <div className="min-w-0">
                <div
                  className={`
                      inline-flex rounded-[8px] box-border
                      border-[0.5px] border-rb-neutral-line 
                      bg-r-neutral-bg-1 px-12 h-[40px] items-center justify-center
                  `}
                >
                  <div className="flex items-center gap-6">
                    <SymbolIcon tokenSymbol={repayToken.symbol} size={24} />
                    <span className="text-[18px] leading-[22px] font-medium text-r-neutral-title-1">
                      {repayToken.symbol}
                    </span>
                  </div>
                </div>
                <div className="mt-12 flex items-center gap-4 text-[13px] leading-[16px] text-r-neutral-foot">
                  <span>
                    {t('page.lending.debtSwap.borrowBalance')}:{' '}
                    {debtBalanceToDisplay}
                  </span>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col items-end">
                <LendingStyledInput
                  value={repayAmount}
                  onValueChange={handleRepayAmountChange}
                  placeholder="0"
                  fontSize={24}
                  className="h-[40px] border-0 bg-transparent p-0 text-right font-medium leading-[40px] text-r-neutral-title-1 hover:border-r-0"
                />
                <div className="flex items-center gap-8 mt-12">
                  {repayAmount && new BigNumber(repayAmount).gt(0) ? (
                    <span className="text-[13px] leading-[15px] text-r-neutral-foot">
                      {debtUsdValue}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="px-16 pt-16 pb-18">
            <div className="mb-16 text-[13px] leading-[15px] font-medium text-r-neutral-title-1">
              {t('page.lending.repayWithCollateral.repayWith')}
            </div>
            <div className="flex items-start justify-between gap-12">
              <div className="min-w-0">
                {selectedCollateralToken ? (
                  <button
                    type="button"
                    className={`
                      inline-flex gap-6 rounded-[8px] 
                      bg-r-neutral-card-2 px-12 
                      h-[40px] items-center justify-center
                    `}
                    onClick={() => setCollateralPopupVisible(true)}
                  >
                    <SymbolIcon
                      tokenSymbol={selectedCollateralToken.symbol}
                      size={24}
                    />
                    <span className="text-[18px] leading-[22px] font-medium text-r-neutral-title-1">
                      {selectedCollateralToken.symbol}
                    </span>
                    <RcImgArrowDownCC
                      viewBox="0 0 16 16"
                      className="h-16 w-16 text-r-neutral-foot"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center gap-6 rounded-[8px] bg-r-neutral-card-2 px-12 py-8"
                    onClick={() => setCollateralPopupVisible(true)}
                  >
                    <span className="text-[18px] leading-[24px] font-medium text-r-neutral-title-1">
                      {t('page.lending.debtSwap.actions.select')}
                    </span>
                    <RcImgArrowDownCC
                      viewBox="0 0 16 16"
                      className="h-16 w-16 text-r-neutral-foot"
                    />
                  </button>
                )}

                {selectedCollateralToken ? (
                  <div className="mt-12 flex items-center gap-4 text-[13px] leading-[16px] text-r-neutral-foot">
                    <RcIconWalletCC className="h-16 w-16 text-r-neutral-foot" />
                    <span>
                      {formatTokenAmount(
                        selectedCollateralToken.balance || '0'
                      )}
                    </span>
                    <button
                      type="button"
                      className="rounded-[2px] bg-rb-brand-light-1 px-4 py-[2px] text-[11px] font-medium leading-[11px] text-rb-brand-default hover:bg-rb-brand-light-2 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => setRepayAmount(debtBalance.toString(10))}
                      disabled={debtBalance.lte(0)}
                    >
                      MAX
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-1 flex-col items-end">
                <span
                  className={`
                    text-[24px] h-[40px] items-center justify-center font-medium leading-[40px] text-r-neutral-title-1 ${
                      isQuoteLoading ? 'opacity-50' : ''
                    }`}
                >
                  {collateralAmount ? formatTokenAmount(collateralAmount) : '0'}
                </span>
                {selectedCollateralToken ? (
                  <span
                    className={`text-[13px] leading-[15px] mt-12 text-r-neutral-foot ${
                      isQuoteLoading ? 'opacity-50' : ''
                    }`}
                  >
                    {collateralUsdValue}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <ArrowLoadingWrapper className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[32px] w-[32px] -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-[32px] w-[32px] items-center justify-center rounded-full border-[0.5px] border-rb-neutral-line bg-r-neutral-bg-1">
              <RcIconSwitchCC
                className="h-16 w-16 text-r-neutral-foot"
                viewBox="0 0 16 16"
              />
              <RcIconLoading
                viewBox="0 0 49 49"
                style={{
                  animationDuration: '0.5s!important',
                }}
                className={clsx(
                  'text-r-blue-default absolute left-0 top-0 h-[32px] w-[32px] transition-opacity',
                  isQuoteLoading ? 'opacity-100 loading-spin' : 'opacity-0'
                )}
              />
            </div>
          </ArrowLoadingWrapper>
        </div>

        {noQuote && !isQuoteLoading && repayAmount ? (
          <div className="mt-12 rounded-[8px] border border-rb-red-default bg-rb-red-light-1 px-12 py-10">
            <span className="text-[13px] leading-[16px] text-rb-red-default">
              {t('page.swap.no-quote-found')}
            </span>
          </div>
        ) : null}

        {canRepay && !noQuote ? (
          <div className="mt-16 px-16">
            <BridgeSlippage
              value={slippage}
              displaySlippage={displaySlippage}
              onChange={setSlippage}
              autoSlippage={autoSlippage}
              isCustomSlippage={isCustomSlippage}
              setAutoSlippage={setAutoSlippage}
              setIsCustomSlippage={setIsCustomSlippage}
              type="swap"
            />
          </div>
        ) : null}

        {canRepay &&
        !noQuote &&
        priceImpactData.showWarning &&
        !isQuoteLoading ? (
          <div className="mt-12 rounded-[8px] border border-rb-orange-default bg-rb-orange-light-1 px-12 py-10">
            <div className="flex items-center justify-between gap-8">
              <span className="text-[13px] leading-[16px] text-r-neutral-title-1">
                {t('page.bridge.price-impact')}
              </span>
              <span className="text-[13px] leading-[16px] font-medium text-rb-orange-default">
                {(priceImpactData.lostValue * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-8 text-[12px] leading-[16px] text-r-neutral-foot">
              {t('page.lending.debtSwap.priceImpactTips', {
                lostValue: `${(priceImpactData.lostValue * 100).toFixed(1)}%`,
              })}
            </div>
          </div>
        ) : null}

        {canShowDirectSubmit && canRepay && chainInfo?.serverId ? (
          <div className="mt-12 px-16">
            <DirectSignGasInfo
              supportDirectSign
              loading={false}
              openShowMore={noop}
              chainServeId={chainInfo.serverId}
              noQuote={false}
              type="send"
            />
          </div>
        ) : null}

        {!((noQuote && !isQuoteLoading) || collateralNotEnough) &&
        selectedCollateralToken ? (
          <RepayWithCollateralOverview
            fromToken={selectedCollateralToken}
            toToken={repayToken}
            fromAmount={collateralAmountAfterSlippage}
            currentToAmount={
              repayDisplayReserve?.variableBorrows ||
              reserve.variableBorrows ||
              '0'
            }
            toAmount={debouncedRepayAmount}
            fromBalanceBn={selectedCollateralToken.balance || '0'}
            isQuoteLoading={isQuoteLoading}
            currentHF={currentHF}
            afterHF={afterSwapInfo?.hfAfterSwap.toString()}
          />
        ) : null}
      </div>

      <div
        className={
          embedded
            ? 'mt-16 w-full border-t-[0.5px] border-rb-neutral-line px-0 pt-16'
            : 'mt-16 w-full border-t-[0.5px] border-rb-neutral-line px-0 pt-16'
        }
      >
        <CollateralTokenPopup
          visible={collateralPopupVisible}
          options={collateralPopupOptions}
          selectedAddress={selectedCollateralToken?.addressToSwap}
          onClose={() => setCollateralPopupVisible(false)}
          onSelect={(token) => {
            handleSelectCollateral(token.addressToSwap);
            setCollateralPopupVisible(false);
          }}
          getContainer={getContainer}
        />

        {collateralNotEnough || isLiquidatable ? (
          <div className="mb-12 rounded-[8px] border border-rb-red-default bg-rb-red-light-1 px-12 py-10 flex items-start gap-8">
            <RcIconWarningCC className="w-16 h-16 flex-shrink-0 text-rb-red-default mt-[1px]" />
            <span className="text-[13px] leading-[16px] text-rb-red-default">
              {collateralNotEnough
                ? t('page.lending.repayWithCollateral.collateralNotEnough')
                : t('page.lending.debtSwap.lpDangerWarning')}
            </span>
          </div>
        ) : null}

        {isRisky && !collateralNotEnough && !isLiquidatable ? (
          <>
            <div className="mb-8 rounded-[8px] border border-rb-orange-default bg-rb-orange-light-1 px-12 py-10 flex items-start gap-8">
              <RcIconWarningCC className="w-16 h-16 flex-shrink-0 text-rb-orange-default mt-[1px]" />
              <span className="text-[13px] leading-[16px] text-rb-orange-default">
                {riskDesc}
              </span>
            </div>
            <div className="mb-12 flex items-start gap-8">
              <StyledCheckbox
                checked={riskChecked}
                onChange={(e) => setRiskChecked(e.target.checked)}
              />
              <span className="text-[13px] leading-[16px] text-r-neutral-foot">
                {t('page.lending.risk.checkbox')}
              </span>
            </div>
          </>
        ) : null}

        {canShowDirectSubmit && currentAccount?.type ? (
          <DirectSignToConfirmBtn
            className="w-full"
            title={t('page.lending.repayWithCollateral.button.repay')}
            disabled={buttonDisabled}
            loading={miniSignLoading}
            onConfirm={() => handleRepay()}
            accountType={currentAccount.type}
          />
        ) : (
          <Button
            type="primary"
            block
            size="large"
            className="h-[48px] rounded-[8px] font-medium text-[16px]"
            loading={isLoading}
            disabled={buttonDisabled}
            onClick={() => handleRepay()}
          >
            {t('page.lending.repayWithCollateral.button.repay')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default RepayWithCollateralContent;
