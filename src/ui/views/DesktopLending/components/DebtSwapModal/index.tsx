import { ChainId } from '@aave/contract-helpers';
import { normalizeBN, valueToBigNumber } from '@aave/math-utils';
import { Button, message } from 'antd';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { OptimalRate } from '@paraswap/sdk';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { PopulatedTransaction } from 'ethers';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { DirectSignToConfirmBtn } from '@/ui/component/ToConfirmButton';
import { useSceneAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { useDebouncedValue } from '@/ui/hooks/useDebounceValue';
import { ReactComponent as RcIconSwitchCC } from '@/ui/assets/bridge/switch-arrow-cc.svg';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/lending/warning-2.svg';
import { ReactComponent as RcIconLoading } from '@/ui/assets/swap/quote-circle-loading-cc.svg';
import { ReactComponent as RcImgArrowDownCC } from '@/ui/assets/swap/arrow-down-cc.svg';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { DirectSignGasInfo } from '@/ui/views/Bridge/Component/BridgeShowMore';
import { BridgeSlippage } from '@/ui/views/Bridge/Component/BridgeSlippage';
import { SwapSlider } from '@/ui/views/Swap/Component/Slider';
import { formatTokenAmount } from '@/ui/utils/number';
import { isSameAddress, noop } from '@/ui/utils';
import { useWallet } from '@/ui/utils/WalletContext';
import stats from '@/stats';
import { INPUT_NUMBER_RE, filterNumber } from '@/constant/regexp';

import { getParaswap } from '../../config/paraswap';
import { useLendingSummary } from '../../hooks';
import { useSelectedMarket } from '../../hooks/market';
import { usePoolDataProviderContract } from '../../hooks/pool';
import { DisplayPoolReserveInfo, UserSummary } from '../../types';
import { ParaswapRatesType, SwappableToken, SwapType } from '../../types/swap';
import { LendingReportType } from '../../types/tx';
import { APP_CODE_LENDING_DEBT_SWAP } from '../../utils/constant';
import {
  buildDebtSwitchTx,
  generateApproveDelegation,
} from '../../utils/poolService';
import { getDebtTokensToDisplay, getFromToken } from '../../utils/swap';
import { LendingStyledInput } from '../StyledInput';
import { StyledCheckbox } from '../BorrowModal';
import SymbolIcon from '../SymbolIcon';
import DebtSwapOverview from './Overview';
import DebtTokenPopup from './DebtTokenPopup';
import {
  useDebtSwapSlippage,
  useFormatValues,
  useHFForDebtSwap,
  useSwapReserves,
} from './hook';
import { getParaswapSellRates } from '../RepayWithCollateralContent/paraswap';
import { DEFAULT_DEBT_SWAP_SLIPPAGE, getApproveAmount } from './utils';
import {
  formatLendingSwapTx as formatTx,
  getPriceImpactData,
  getToAmountAfterSlippage,
  maxInputAmountWithSlippage,
} from '../../utils/swapAction';

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

type DebtSwapModalProps = {
  visible: boolean;
  onCancel: () => void;
  reserve: DisplayPoolReserveInfo;
  userSummary: UserSummary | null;
};

export const DebtSwapModal: React.FC<DebtSwapModalProps> = ({
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
  const { selectedMarketData, chainInfo } = useSelectedMarket();
  const { pools } = usePoolDataProviderContract();
  const { getContainer } = usePopupContainer();

  const summary = useMemo(() => userSummary ?? contextUserSummary, [
    contextUserSummary,
    userSummary,
  ]);

  const fromToken = useMemo(() => {
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

  const debtTokenOptions = useMemo(() => {
    return getDebtTokensToDisplay({
      user: summary,
      reserves: formattedPoolReservesAndIncentives,
      displayPoolReserves,
      chainId: chainInfo?.id,
      market: selectedMarketData?.market,
      excludeTokenAddress: fromToken?.underlyingAddress || '',
    });
  }, [
    displayPoolReserves,
    formattedPoolReservesAndIncentives,
    fromToken?.underlyingAddress,
    summary,
    chainInfo?.id,
    selectedMarketData?.market,
  ]);

  const [fromAmount, setFromAmount] = useState('');
  const [slider, setSlider] = useState(0);
  const debouncedFromAmount = useDebouncedValue(fromAmount || '0', 400);
  const [toToken, setToToken] = useState<SwappableToken | undefined>();
  const [toAmount, setToAmount] = useState('');
  const [toTokenPopupVisible, setToTokenPopupVisible] = useState(false);
  const [quote, setQuote] = useState<ParaswapRatesType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [miniSignLoading, setMiniSignLoading] = useState(false);
  const [riskChecked, setRiskChecked] = useState(false);
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
    fromBalanceBn,
    fromBalanceDisplay,
    fromUsdValue,
    toUsdValue,
  } = useFormatValues({
    fromToken: fromToken!,
    toToken,
    fromAmount,
    toAmount,
  });

  const {
    fromReserve,
    toReserve,
    isSameToken,
    toDisplayReserve,
  } = useSwapReserves({
    fromToken: fromToken!,
    toToken,
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
  } = useDebtSwapSlippage({
    fromToken: fromToken!,
    toToken,
    setSwapRate,
  });

  const toAmountAfterSlippage = useMemo(
    () =>
      getToAmountAfterSlippage({
        inputAmount: toAmount,
        slippage: Number(slippage || 0) * 100,
      }),
    [slippage, toAmount]
  );

  const priceImpactData = useMemo(
    () =>
      getPriceImpactData({
        fromToken,
        toToken,
        fromAmount: debouncedFromAmount,
        toAmount: toAmountAfterSlippage,
      }),
    [debouncedFromAmount, fromToken, toAmountAfterSlippage, toToken]
  );

  const {
    currentHF,
    afterSwapInfo,
    isHFLow,
    isLiquidatable,
  } = useHFForDebtSwap({
    fromToken: fromToken!,
    toToken,
    fromAmount: debouncedFromAmount,
    toAmount: toAmountAfterSlippage,
  });

  const isExceedMaxLtvAfterSwap = useMemo(() => {
    if (
      !toToken ||
      !summary ||
      !debouncedFromAmount ||
      !toAmountAfterSlippage ||
      !fromReserve?.formattedPriceInMarketReferenceCurrency ||
      !toReserve?.formattedPriceInMarketReferenceCurrency
    ) {
      return false;
    }

    const fromPriceInMarketRef = valueToBigNumber(
      fromReserve.formattedPriceInMarketReferenceCurrency
    );
    const toPriceInMarketRef = valueToBigNumber(
      toReserve.formattedPriceInMarketReferenceCurrency
    );

    if (fromPriceInMarketRef.lte(0) || toPriceInMarketRef.lte(0)) {
      return false;
    }

    const increasedDebtInMarketRef = valueToBigNumber(toAmountAfterSlippage)
      .multipliedBy(toPriceInMarketRef)
      .minus(
        valueToBigNumber(debouncedFromAmount).multipliedBy(fromPriceInMarketRef)
      );

    if (increasedDebtInMarketRef.lte(0)) {
      return false;
    }

    const availableBorrowsInMarketRef = valueToBigNumber(
      summary.availableBorrowsMarketReferenceCurrency || '0'
    );

    return increasedDebtInMarketRef.gt(availableBorrowsInMarketRef);
  }, [
    debouncedFromAmount,
    fromReserve?.formattedPriceInMarketReferenceCurrency,
    summary,
    toAmountAfterSlippage,
    toReserve?.formattedPriceInMarketReferenceCurrency,
    toToken,
  ]);

  const canShowDirectSubmit = useMemo(
    () =>
      !!currentAccount &&
      !!chainInfo &&
      !chainInfo.isTestnet &&
      supportedDirectSign(currentAccount.type || ''),
    [chainInfo, currentAccount]
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
      setFromAmount('');
      setSlider(0);
      setToAmount('');
      setToToken(undefined);
      setQuote(null);
      setSwapRate({});
      setRiskChecked(false);
      setToTokenPopupVisible(false);
      setNoQuote(false);
      setCurrentTxs([]);
      setIsQuoteLoading(false);
      setIsLoading(false);
      setMiniSignLoading(false);
    }
  }, [clearQuoteExpiredTimer, visible]);

  useEffect(() => {
    setRiskChecked(false);
  }, [displaySlippage, isHFLow, priceImpactData.showConfirmation]);

  const handleFromAmountChange = useCallback(
    (value: string) => {
      if (!fromToken) {
        return;
      }

      if (value === '') {
        setFromAmount('');
        setSlider(0);
        return;
      }

      if (!INPUT_NUMBER_RE.test(value)) {
        return;
      }

      const filtered = filterNumber(value);
      if (!filtered) {
        setFromAmount('');
        setSlider(0);
        return;
      }

      const amountBn = new BigNumber(filtered);

      const safeAmountBn = amountBn.gt(fromBalanceBn)
        ? fromBalanceBn
        : amountBn;
      const cappedAmount = amountBn.gt(fromBalanceBn)
        ? fromBalanceBn.toString(10)
        : filtered;

      const nextSlider = fromBalanceBn.gt(0)
        ? safeAmountBn.div(fromBalanceBn).times(100).toNumber()
        : 0;

      setFromAmount(cappedAmount);
      setSlider(Math.min(100, Math.max(0, nextSlider)));
    },
    [fromBalanceBn, fromToken]
  );

  const handleSliderChange = useCallback(
    (value: number) => {
      if (!fromToken) {
        return;
      }

      const nextSlider = Math.min(100, Math.max(0, Number(value) || 0));
      setSlider(nextSlider);

      if (nextSlider === 0 || !fromBalanceBn.gt(0)) {
        setFromAmount('');
        return;
      }

      if (nextSlider === 100) {
        setFromAmount(fromBalanceBn.toString(10));
        return;
      }

      const newAmountBn = fromBalanceBn.multipliedBy(nextSlider).div(100);
      const nextAmount = newAmountBn.lt(0.0001)
        ? newAmountBn.toString(10)
        : new BigNumber(newAmountBn.toFixed(4, BigNumber.ROUND_DOWN)).toString(
            10
          );

      setFromAmount(nextAmount);
    },
    [fromBalanceBn, fromToken]
  );

  useEffect(() => {
    let cancelled = false;

    const fetchQuote = async () => {
      const resetQuote = () => {
        setToAmount('');
        setQuote(null);
        setSwapRate({});
        setIsQuoteLoading(false);
        setNoQuote(false);
        enableQuoteAutoRefreshRef.current = false;
        clearQuoteExpiredTimer();
      };

      if (!visible || !fromToken) {
        resetQuote();
        return;
      }

      setIsQuoteLoading(true);

      if (
        !toToken ||
        isSameToken ||
        !debouncedFromAmount ||
        !currentAccount?.address
      ) {
        resetQuote();
        return;
      }

      if (new BigNumber(debouncedFromAmount || 0).lte(0)) {
        resetQuote();
        return;
      }

      try {
        const rawAmount = normalizeBN(
          debouncedFromAmount,
          -1 * fromToken.decimals
        ).toFixed(0);

        const quoteRes = await getParaswapSellRates({
          swapType: SwapType.DebtSwap,
          chainId: fromToken.chainId,
          amount: rawAmount,
          srcToken: toToken.addressToSwap,
          destToken: fromToken.addressToSwap,
          user: currentAccount.address,
          srcDecimals: toToken.decimals,
          destDecimals: fromToken.decimals,
          side: 'buy',
          appCode: APP_CODE_LENDING_DEBT_SWAP,
          options: {
            partner: APP_CODE_LENDING_DEBT_SWAP,
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
          toToken: toToken.addressToSwap,
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
        setToAmount(destAmount);
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
          setToAmount('');
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
    currentAccount?.address,
    debouncedFromAmount,
    fromToken,
    isSameToken,
    quoteRefreshId,
    slippageBpsRef,
    toToken,
    visible,
  ]);

  const buildDebtSwapTxs = useCallback(async (): Promise<Tx[]> => {
    if (
      !currentAccount ||
      !fromToken ||
      !toToken ||
      !quote ||
      !swapRate.optimalRateData ||
      !selectedMarketData?.addresses?.DEBT_SWITCH_ADAPTER ||
      !pools?.provider ||
      !toReserve ||
      !fromReserve
    ) {
      return [];
    }

    const rawAmount = normalizeBN(
      debouncedFromAmount,
      -1 * fromToken.decimals
    ).toFixed(0);

    if (
      !lastQuoteParamsRef.current ||
      lastQuoteParamsRef.current.rawAmount !== rawAmount ||
      lastQuoteParamsRef.current.toToken !== toToken.addressToSwap
    ) {
      throw new Error('quote-outdated');
    }

    const { paraswap, feeTarget } = getParaswap(fromToken.chainId as ChainId);
    const slippageBps = swapRate.slippageBps ?? DEFAULT_DEBT_SWAP_SLIPPAGE;

    const txParams = await paraswap.buildTx(
      {
        srcToken: toToken.addressToSwap,
        destToken: fromToken.addressToSwap,
        destAmount: rawAmount,
        slippage: slippageBps,
        priceRoute: swapRate.optimalRateData,
        userAddress: currentAccount.address,
        partnerAddress: feeTarget,
        srcDecimals: toToken.decimals,
        destDecimals: fromToken.decimals,
        isDirectFeeTransfer: true,
        takeSurplus: true,
      },
      {
        ignoreChecks: true,
      }
    );

    const maxNewDebtAmount =
      swapRate.maxInputAmountWithSlippage ||
      swapRate.inputAmount ||
      swapRate.optimalRateData.srcAmount ||
      '0';
    const isMaxSelected = new BigNumber(debouncedFromAmount || 0).gte(
      fromBalanceBn.toString(10)
    );

    const debtSwitchTx = buildDebtSwitchTx({
      provider: pools.provider,
      address: currentAccount.address,
      fromAddress: fromToken.underlyingAddress,
      rawAmount,
      isMaxSelected,
      debtSwitchAdapterAddress:
        selectedMarketData.addresses.DEBT_SWITCH_ADAPTER,
      maxNewDebtAmount,
      txCalldata: txParams.data,
      augustus: txParams.to,
      newAssetDebtToken: toReserve.variableDebtTokenAddress,
      newAssetUnderlying: toToken.underlyingAddress,
    });

    const delegationTx = toReserve.variableDebtTokenAddress
      ? await generateApproveDelegation({
          provider: pools.provider,
          address: currentAccount.address,
          delegatee: selectedMarketData.addresses.DEBT_SWITCH_ADAPTER,
          debtTokenAddress: toReserve.variableDebtTokenAddress,
          amount: getApproveAmount(maxNewDebtAmount, slippageBps),
          decimals: toToken.decimals,
        })
      : undefined;

    const txs: Tx[] = [];
    const formattedDelegationTx = delegationTx
      ? formatTx(
          delegationTx as PopulatedTransaction,
          currentAccount.address,
          fromToken.chainId
        )
      : undefined;
    const formattedDebtSwitchTx = formatTx(
      debtSwitchTx as PopulatedTransaction,
      currentAccount.address,
      fromToken.chainId
    );

    if (formattedDelegationTx) {
      txs.push(formattedDelegationTx);
    }
    if (formattedDebtSwitchTx) {
      txs.push(formattedDebtSwitchTx);
    }

    return txs;
  }, [
    currentAccount,
    debouncedFromAmount,
    fromBalanceBn,
    fromReserve,
    fromToken,
    pools?.provider,
    quote,
    selectedMarketData?.addresses?.DEBT_SWITCH_ADAPTER,
    swapRate.inputAmount,
    swapRate.maxInputAmountWithSlippage,
    swapRate.optimalRateData,
    swapRate.slippageBps,
    toReserve,
    toToken,
  ]);

  useEffect(() => {
    let cancelled = false;

    const buildTransactions = async () => {
      if (
        !visible ||
        !currentAccount ||
        !toToken ||
        !quote ||
        !swapRate.optimalRateData ||
        !selectedMarketData?.addresses?.DEBT_SWITCH_ADAPTER ||
        !pools?.provider ||
        !toReserve ||
        !fromReserve ||
        !debouncedFromAmount ||
        new BigNumber(debouncedFromAmount).lte(0)
      ) {
        if (!cancelled) {
          setCurrentTxs([]);
        }
        return;
      }

      try {
        const txs = await buildDebtSwapTxs();
        if (!cancelled) {
          setCurrentTxs(txs);
        }
      } catch {
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
    buildDebtSwapTxs,
    currentAccount,
    debouncedFromAmount,
    fromReserve,
    pools?.provider,
    quote,
    selectedMarketData?.addresses?.DEBT_SWITCH_ADAPTER,
    swapRate.optimalRateData,
    toReserve,
    toToken,
    visible,
  ]);

  useEffect(() => {
    if (!currentAccount || !canShowDirectSubmit) {
      prefetch({ txs: [] });
      return;
    }

    closeSign();

    if (!visible || !currentTxs.length || isLiquidatable) {
      prefetch({ txs: [] });
      return;
    }

    prefetch({
      txs: currentTxs,
      ga: {
        category: 'Lending',
        source: 'Lending',
        trigger: 'DebtSwap',
      },
    }).catch((error) => {
      if (error !== MINI_SIGN_ERROR.PREFETCH_FAILURE) {
        console.error('lending debt swap prefetch error', error);
      }
    });

    return () => {
      closeSign();
      prefetch({ txs: [] });
    };
  }, [
    canShowDirectSubmit,
    closeSign,
    currentAccount,
    currentTxs,
    isLiquidatable,
    prefetch,
    visible,
  ]);

  const handleSwap = useCallback(
    async (forceFullSign?: boolean) => {
      if (
        !currentAccount ||
        !fromToken ||
        !toToken ||
        !currentTxs.length ||
        !chainInfo
      ) {
        return;
      }

      if (isExceedMaxLtvAfterSwap) {
        message.error(t('page.lending.debtSwap.maxLtvWarning'));
        return;
      }

      const report = (lastHash: string) => {
        const usdValue = new BigNumber(debouncedFromAmount || '0')
          .multipliedBy(new BigNumber(fromToken.usdPrice || '0'))
          .toString();

        stats.report('aaveInternalTx', {
          tx_type: LendingReportType.DebtSwap,
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
                trigger: 'DebtSwap',
              },
            });
            const hash = hashes[hashes.length - 1];

            if (hash) {
              report(hash);
              message.success(
                `${t('page.lending.debtSwap.button.swap')} ${t(
                  'page.lending.submitted'
                )}`
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

            await handleSwap(true);
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
                  trigger: 'DebtSwap',
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
          `${t('page.lending.debtSwap.button.swap')} ${t(
            'page.lending.submitted'
          )}`
        );
        onCancel();
      } catch (error) {
        console.error('debt swap error', error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      canShowDirectSubmit,
      chainInfo,
      currentAccount,
      currentTxs,
      debouncedFromAmount,
      fromToken,
      getContainer,
      onCancel,
      openDirect,
      t,
      toToken,
      wallet,
      isExceedMaxLtvAfterSwap,
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

  const canSwap = useMemo(
    () =>
      !!fromToken &&
      !!toToken &&
      !isSameToken &&
      !!quote &&
      !!debouncedFromAmount &&
      new BigNumber(debouncedFromAmount).gt(0) &&
      new BigNumber(debouncedFromAmount).lte(fromBalanceBn.toString(10)) &&
      !isQuoteLoading,
    [
      debouncedFromAmount,
      fromBalanceBn,
      fromToken,
      isQuoteLoading,
      isSameToken,
      quote,
      toToken,
    ]
  );

  const canSubmit = useMemo(
    () =>
      canSwap &&
      !!currentAccount &&
      !!currentTxs.length &&
      !isLoading &&
      !miniSignLoading,
    [canSwap, currentAccount, currentTxs.length, isLoading, miniSignLoading]
  );

  const buttonDisabled = useMemo(
    () =>
      !canSubmit ||
      (isRisky && !riskChecked) ||
      isLiquidatable ||
      isExceedMaxLtvAfterSwap,
    [canSubmit, isExceedMaxLtvAfterSwap, isLiquidatable, isRisky, riskChecked]
  );

  if (!reserve?.reserve?.symbol || !fromToken) {
    return null;
  }

  return (
    <div className="relative flex h-[600px] flex-col rounded-[8px] bg-r-neutral-bg-2 px-[20px] pt-[16px] pb-[16px]">
      <div className="mb-[16px]">
        <div className="text-[20px] text-center leading-[24px] font-medium text-r-neutral-title-1">
          {t('page.lending.debtSwap.title')}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-[80px]">
        <div className="mb-8 text-[13px] leading-[15px] text-r-neutral-foot">
          {t('page.lending.debtSwap.actions.amount')}
        </div>

        <div className="relative overflow-hidden rounded-[8px] bg-rb-neutral-card-1">
          <div className="border-b-[0.5px] border-rb-neutral-line px-16 pt-16 pb-18">
            <div className="mb-16 flex items-center justify-between">
              <span className="text-[13px] leading-[15px] font-medium text-r-neutral-title-1">
                {t('page.lending.debtSwap.actions.borrowed')}
              </span>
              <div className="flex items-center gap-8">
                <div className="relative pr-[40px]">
                  <SwapSlider
                    className="w-[125px]"
                    value={slider}
                    onChange={handleSliderChange}
                    onAfterChange={handleSliderChange}
                    min={0}
                    max={100}
                    tooltipVisible={false}
                    disabled={!fromToken || fromBalanceBn.lte(0)}
                  />
                  <span className="absolute top-1/2 -right-12 w-[38px] -translate-y-1/2 text-[13px] leading-[15px] font-medium text-rb-brand-default">
                    {`${Math.round(slider)}%`}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-start justify-between gap-12">
              <div className="min-w-0">
                <div className="inline-flex h-[40px] items-center justify-center rounded-[8px] border-[0.5px] border-rb-neutral-line bg-r-neutral-bg-1 px-12">
                  <div className="flex items-center gap-6">
                    <SymbolIcon tokenSymbol={fromToken.symbol} size={24} />
                    <span className="text-[18px] leading-[22px] font-medium text-r-neutral-title-1">
                      {fromToken.symbol}
                    </span>
                  </div>
                </div>
                <div className="mt-12 flex items-center gap-4 text-[13px] leading-[16px] text-r-neutral-foot">
                  <span>
                    {t('page.lending.debtSwap.borrowBalance')}:{' '}
                    {fromBalanceDisplay}
                  </span>
                  <button
                    type="button"
                    className="rounded-[2px] bg-rb-brand-light-1 px-4 py-[2px] text-[11px] font-medium leading-[11px] text-rb-brand-default hover:bg-rb-brand-light-2 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => handleSliderChange(100)}
                    disabled={fromBalanceBn.lte(0)}
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col items-end">
                <LendingStyledInput
                  value={fromAmount}
                  onValueChange={handleFromAmountChange}
                  placeholder="0"
                  fontSize={24}
                  className="h-[40px] border-0 bg-transparent p-0 text-right font-medium leading-[40px] text-r-neutral-title-1 hover:border-r-0"
                />
                <div className="mt-12 flex items-center gap-8">
                  {fromAmount && new BigNumber(fromAmount).gt(0) ? (
                    <span className="text-[13px] leading-[15px] text-r-neutral-foot">
                      {fromUsdValue}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="px-16 pt-16 pb-18">
            <div className="mb-16 text-[13px] leading-[15px] font-medium text-r-neutral-title-1">
              {t('page.lending.debtSwap.actions.swapTo')}
            </div>
            <div className="flex items-start justify-between gap-12">
              <div className="min-w-0">
                <button
                  type="button"
                  className="inline-flex h-[40px] items-center justify-center gap-6 rounded-[8px] bg-r-neutral-card-2 px-12"
                  onClick={() => setToTokenPopupVisible(true)}
                >
                  {toToken ? (
                    <>
                      <SymbolIcon tokenSymbol={toToken.symbol} size={24} />
                      <span className="text-[18px] leading-[22px] font-medium text-r-neutral-title-1">
                        {toToken.symbol}
                      </span>
                    </>
                  ) : (
                    <span className="text-[18px] leading-[22px] font-medium text-r-neutral-title-1">
                      {t('page.lending.debtSwap.actions.select')}
                    </span>
                  )}
                  <RcImgArrowDownCC
                    viewBox="0 0 16 16"
                    className="h-16 w-16 text-r-neutral-foot"
                  />
                </button>

                {toToken ? (
                  <div className="mt-12 flex items-center gap-4 text-[13px] leading-[16px] text-r-neutral-foot">
                    <RcIconWalletCC className="h-16 w-16 text-r-neutral-foot" />
                    <span>
                      {formatTokenAmount(
                        toDisplayReserve?.variableBorrows || '0'
                      )}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-1 flex-col items-end">
                <span
                  className={clsx(
                    'text-[24px] h-[40px] font-medium leading-[40px] text-r-neutral-title-1',
                    isQuoteLoading && 'opacity-50'
                  )}
                >
                  {toAmount ? formatTokenAmount(toAmount) : '0'}
                </span>
                {toToken ? (
                  <span
                    className={clsx(
                      'text-[13px] leading-[15px] mt-12 text-r-neutral-foot',
                      isQuoteLoading && 'opacity-50'
                    )}
                  >
                    {toUsdValue}
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
                style={{ animationDuration: '0.5s!important' }}
                className={clsx(
                  'text-r-blue-default absolute left-0 top-0 h-[32px] w-[32px] transition-opacity',
                  isQuoteLoading ? 'opacity-100 loading-spin' : 'opacity-0'
                )}
              />
            </div>
          </ArrowLoadingWrapper>
        </div>

        {noQuote && !isQuoteLoading && fromAmount ? (
          <div className="mt-12 rounded-[8px] border border-rb-red-default bg-rb-red-light-1 px-12 py-10">
            <span className="text-[13px] leading-[16px] text-rb-red-default">
              {t('page.swap.no-quote-found')}
            </span>
          </div>
        ) : null}

        {canSwap && !noQuote ? (
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
              valueClassName="text-[14px] font-[700]"
            />
          </div>
        ) : null}

        {canShowDirectSubmit && canSwap && chainInfo?.serverId ? (
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

        {/*{canSwap &&
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
        ) : null}*/}

        {!noQuote && toToken && !!Number(debouncedFromAmount) ? (
          <DebtSwapOverview
            fromToken={fromToken}
            toToken={toToken}
            fromAmount={debouncedFromAmount}
            toAmount={toAmountAfterSlippage}
            fromBalanceBn={fromBalanceBn.toString()}
            currentToAmount={toDisplayReserve?.variableBorrows || '0'}
            isQuoteLoading={isQuoteLoading}
            currentHF={currentHF}
            afterHF={afterSwapInfo?.hfAfterSwap?.toString()}
            showHF={isHFLow || isLiquidatable}
          />
        ) : null}
      </div>

      <div className="sticky bottom-0 z-20 w-full border-t-[0.5px] border-rb-neutral-line bg-r-neutral-bg-2 px-0 pt-16 pb-16">
        <DebtTokenPopup
          visible={toTokenPopupVisible}
          options={debtTokenOptions}
          selectedAddress={toToken?.addressToSwap}
          onClose={() => setToTokenPopupVisible(false)}
          onSelect={(token) => {
            setToToken(token);
            setToAmount('');
            setQuote(null);
            setSwapRate({});
            setCurrentTxs([]);
            setNoQuote(false);
            setIsQuoteLoading(false);
            setToTokenPopupVisible(false);
          }}
          getContainer={getContainer}
        />

        {isExceedMaxLtvAfterSwap ? (
          <div className="mb-12 rounded-[8px] border border-rb-red-default bg-rb-red-light-1 px-12 py-10 flex items-start gap-8">
            <RcIconWarningCC className="w-16 h-16 flex-shrink-0 text-rb-red-default mt-[1px]" />
            <span className="text-[13px] leading-[16px] text-rb-red-default">
              {t('page.lending.debtSwap.maxLtvWarning')}
            </span>
          </div>
        ) : isLiquidatable ? (
          <div className="mb-12 rounded-[8px] border border-rb-red-default bg-rb-red-light-1 px-12 py-10 flex items-start gap-8">
            <RcIconWarningCC className="w-16 h-16 flex-shrink-0 text-rb-red-default mt-[1px]" />
            <span className="text-[13px] leading-[16px] text-rb-red-default">
              {t('page.lending.debtSwap.lpDangerWarning')}
            </span>
          </div>
        ) : null}

        {isRisky && !isLiquidatable && !isExceedMaxLtvAfterSwap ? (
          <>
            <div className="mb-8 rounded-[8px] border border-rb-orange-default bg-rb-orange-light-1 px-12 py-10 flex items-start gap-8">
              <RcIconWarningCC className="w-16 h-16 flex-shrink-0 text-rb-orange-default mt-[1px]" />
              <span className="text-[13px] leading-[16px] text-rb-orange-default">
                {riskDesc}
              </span>
            </div>
            <div className="mb-12 flex items-center justify-center gap-8">
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
            title={t('page.lending.debtSwap.button.swap')}
            disabled={buttonDisabled}
            loading={miniSignLoading}
            onConfirm={() => handleSwap()}
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
            onClick={() => handleSwap()}
          >
            {t('page.lending.debtSwap.button.swap')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default DebtSwapModal;
