import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRabbySelector } from '@/ui/store';
import { tokenPriceImpact, useBridge } from '../hooks/token';
import { Alert, Button, message, Modal } from 'antd';
import BigNumber from 'bignumber.js';
import { getUiType, openInternalPageInTab, useWallet } from '@/ui/utils';
import clsx from 'clsx';
import { QuoteList } from './BridgeQuotes';
import {
  usePollBridgePendingNumber,
  useQuoteVisible,
  useSetQuoteVisible,
  useSetRefreshId,
  useSetSettingVisible,
} from '../hooks';
import { useRbiSource } from '@/ui/utils/ga-event';
import { useCss } from 'react-use';
import { findChainByEnum } from '@/utils/chain';
import { useTranslation } from 'react-i18next';

import pRetry, { AbortError } from 'p-retry';
import stats from '@/stats';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { CHAINS_ENUM, DBK_CHAIN_ID } from '@/constant';
import { useHistory } from 'react-router-dom';
import { BridgeToken } from './BridgeToken';
import { BridgeShowMore, RecommendFromToken } from './BridgeShowMore';
import { BridgeSwitchBtn } from './BridgeSwitchButton';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { Header } from './BridgeHeader';
import { obj2query } from '@/ui/utils/url';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useExternalSwapBridgeDapps } from '@/ui/component/ExternalSwapBridgeDappPopup/hooks';
import {
  ExternalSwapBridgeDappTips,
  SwapBridgeDappPopup,
} from '@/ui/component/ExternalSwapBridgeDappPopup';
import { DirectSignToConfirmBtn } from '@/ui/component/ToConfirmButton';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { PendingTxItem } from '../../Swap/Component/PendingTxItem';
import { DbkButton } from '../../Ecology/dbk-chain/components/DbkButton';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';

const isTab = getUiType().isTab;
const isDesktop = getUiType().isDesktop;
const getContainer =
  isTab || isDesktop ? '.js-rabby-desktop-swap-container' : undefined;

export const BridgeContent = () => {
  const { userAddress } = useRabbySelector((state) => ({
    userAddress: state.account.currentAccount?.address || '',
  }));

  const {
    fromChain,
    fromToken,
    setFromToken,
    switchFromChain,
    toChain,
    toToken,
    setToToken,
    switchToChain: setToChain,
    switchToken,
    amount,
    handleAmountChange,

    recommendFromToken,
    fillRecommendFromToken,

    inSufficient,

    openQuotesList,
    quoteLoading,
    quoteList,
    setQuotesList,

    bestQuoteId,
    selectedBridgeQuote,

    setSelectedBridgeQuote,

    slippage,
    slippageState,
    setSlippage,
    setSlippageChanged,
    isSlippageHigh,
    isSlippageLow,

    autoSlippage,
    isCustomSlippage,
    setAutoSlippage,
    setIsCustomSlippage,

    clearExpiredTimer,
    maxNativeTokenGasPrice,
    setMaxNativeTokenGasPrice,
    inSufficientCanGetQuote,
  } = useBridge();

  const [historyVisible, setHistoryVisible] = useState(false);

  const chains = useMemo(
    () => [toChain, fromChain].filter((e) => !!e) as CHAINS_ENUM[],
    [toChain, fromChain]
  );

  const {
    isSupportedChain,
    data: externalDapps,
    loading: externalDappsLoading,
  } = useExternalSwapBridgeDapps(chains, 'bridge');
  const [externalDappOpen, setExternalDappOpen] = useState(false);

  const showExternalDappTips = useMemo(
    () => !isSupportedChain && !!fromChain && !!toChain,
    [isSupportedChain, fromChain, toChain]
  );

  const amountAvailable = useMemo(() => Number(amount) > 0, [amount]);

  const visible = useQuoteVisible();

  const setVisible = useSetQuoteVisible();

  const refresh = useSetRefreshId();

  const { t } = useTranslation();

  const btnText = useMemo(() => {
    if (showExternalDappTips) {
      return t('component.externalSwapBrideDappPopup.bridgeOnDapp');
    }
    if (selectedBridgeQuote?.shouldApproveToken) {
      return t('page.bridge.approve-and-bridge');
    }
    return t('page.bridge.title');
  }, [
    selectedBridgeQuote?.shouldApproveToken,
    showExternalDappTips,
    externalDapps,
  ]);

  const wallet = useWallet();
  const rbiSource = useRbiSource();

  const { pendingNumber, historyList } = usePollBridgePendingNumber() || {
    pendingNumber: 0,
    historyList: [],
  };

  const [fetchingBridgeQuote, setFetchingBridgeQuote] = useState(false);

  const gotoBridge = useCallback(async () => {
    if (
      !inSufficient &&
      fromToken &&
      toToken &&
      selectedBridgeQuote?.bridge_id
    ) {
      try {
        setFetchingBridgeQuote(true);
        const tx = await pRetry(
          () =>
            wallet.openapi
              .buildBridgeTx({
                aggregator_id: selectedBridgeQuote.aggregator.id,
                bridge_id: selectedBridgeQuote.bridge_id,
                from_token_id: fromToken.id,
                user_addr: userAddress,
                from_chain_id: fromToken.chain,
                from_token_raw_amount: new BigNumber(amount)
                  .times(10 ** fromToken.decimals)
                  .toFixed(0, 1)
                  .toString(),
                to_chain_id: toToken.chain,
                to_token_id: toToken.id,
                slippage: new BigNumber(slippageState).div(100).toString(10),
                quote_key: JSON.stringify(selectedBridgeQuote.quote_key || {}),
              })
              .catch((e) => {
                throw new AbortError(e?.message || String(e));
              }),
          { retries: 1 }
        );
        stats.report('bridgeQuoteResult', {
          aggregatorIds: selectedBridgeQuote.aggregator.id,
          bridgeId: selectedBridgeQuote.bridge_id,
          fromChainId: fromToken.chain,
          fromTokenId: fromToken.id,
          toTokenId: toToken.id,
          toChainId: toToken.chain,
          status: tx ? 'success' : 'fail',
        });
        const promise = wallet.bridgeToken(
          {
            to: tx.to,
            value: tx.value,
            data: tx.data,
            payTokenRawAmount: new BigNumber(amount)
              .times(10 ** fromToken.decimals)
              .toFixed(0, 1)
              .toString(),
            chainId: tx.chainId,
            shouldApprove: !!selectedBridgeQuote.shouldApproveToken,
            shouldTwoStepApprove: !!selectedBridgeQuote.shouldTwoStepApprove,
            payTokenId: fromToken.id,
            payTokenChainServerId: fromToken.chain,
            gasPrice: maxNativeTokenGasPrice,
            info: {
              aggregator_id: selectedBridgeQuote.aggregator.id,
              bridge_id: selectedBridgeQuote.bridge_id,
              from_chain_id: fromToken.chain,
              from_token_id: fromToken.id,
              from_token_amount: amount,
              to_chain_id: toToken.chain,
              to_token_id: toToken.id,
              to_token_amount: selectedBridgeQuote.to_token_amount,
              tx: tx,
              rabby_fee: selectedBridgeQuote.rabby_fee.usd_value,
              slippage: new BigNumber(slippage).div(100).toNumber(),
            },
            addHistoryData: {
              address: userAddress,
              fromChainId: findChainByEnum(fromToken.chain)?.id || 0,
              toChainId: findChainByEnum(toToken.chain)?.id || 0,
              fromToken: fromToken,
              toToken: toToken,
              fromAmount: Number(amount),
              toAmount: Number(selectedBridgeQuote.to_token_amount),
              slippage: new BigNumber(slippage).div(100).toNumber(),
              dexId: selectedBridgeQuote.aggregator.id,
              status: 'pending',
              createdAt: Date.now(),
            },
          },
          {
            ga: {
              category: 'Bridge',
              source: 'bridge',
              trigger: rbiSource,
            },
          }
        );
        if (!isTab) {
          window.close();
        } else {
          await promise;
          handleAmountChange('');
        }
      } catch (error) {
        message.error(error?.message || String(error));
        setQuotesList((pre) =>
          pre?.filter(
            (item) =>
              !(
                item?.aggregator?.id === selectedBridgeQuote?.aggregator?.id &&
                item?.bridge_id === selectedBridgeQuote?.bridge_id
              )
          )
        );
        stats.report('bridgeQuoteResult', {
          aggregatorIds: selectedBridgeQuote.aggregator.id,
          bridgeId: selectedBridgeQuote.bridge_id,
          fromChainId: fromToken.chain,
          fromTokenId: fromToken.id,
          toTokenId: toToken.id,
          toChainId: toToken.chain,
          status: 'fail',
        });
        console.error(error);
      } finally {
        setFetchingBridgeQuote(false);
      }
    }
  }, [
    inSufficient,
    fromToken,
    toToken,
    selectedBridgeQuote?.tx,
    selectedBridgeQuote?.shouldApproveToken,
    selectedBridgeQuote?.shouldTwoStepApprove,
    selectedBridgeQuote?.aggregator.id,
    selectedBridgeQuote?.bridge_id,
    selectedBridgeQuote?.to_token_amount,
    wallet,
    amount,
    rbiSource,
    slippageState,
    maxNativeTokenGasPrice,
  ]);

  const buildTxs = useMemoizedFn(async () => {
    if (
      !inSufficient &&
      fromToken &&
      toToken &&
      selectedBridgeQuote?.bridge_id
    ) {
      try {
        // setFetchingBridgeQuote(true);
        const tx = await pRetry(
          () =>
            wallet.openapi
              .buildBridgeTx({
                aggregator_id: selectedBridgeQuote.aggregator.id,
                bridge_id: selectedBridgeQuote.bridge_id,
                from_chain_id: fromToken.chain,
                from_token_id: fromToken.id,
                user_addr: userAddress,
                from_token_raw_amount: new BigNumber(amount)
                  .times(10 ** fromToken.decimals)
                  .toFixed(0, 1)
                  .toString(),
                to_chain_id: toToken.chain,
                to_token_id: toToken.id,
                slippage: new BigNumber(slippageState).div(100).toString(10),
                quote_key: JSON.stringify(selectedBridgeQuote.quote_key || {}),
              })
              .catch((e) => {
                throw new AbortError(e?.message || String(e));
              }),
          { retries: 1 }
        );
        stats.report('bridgeQuoteResult', {
          aggregatorIds: selectedBridgeQuote.aggregator.id,
          bridgeId: selectedBridgeQuote.bridge_id,
          fromChainId: fromToken.chain,
          fromTokenId: fromToken.id,
          toTokenId: toToken.id,
          toChainId: toToken.chain,
          status: tx ? 'success' : 'fail',
        });
        return wallet.buildBridgeToken(
          {
            to: tx.to,
            value: tx.value,
            data: tx.data,
            payTokenRawAmount: new BigNumber(amount)
              .times(10 ** fromToken.decimals)
              .toFixed(0, 1)
              .toString(),
            chainId: tx.chainId,
            shouldApprove: !!selectedBridgeQuote.shouldApproveToken,
            shouldTwoStepApprove: !!selectedBridgeQuote.shouldTwoStepApprove,
            payTokenId: fromToken.id,
            payTokenChainServerId: fromToken.chain,
            gasPrice: maxNativeTokenGasPrice,
            info: {
              aggregator_id: selectedBridgeQuote.aggregator.id,
              bridge_id: selectedBridgeQuote.bridge_id,
              from_chain_id: fromToken.chain,
              from_token_id: fromToken.id,
              from_token_amount: amount,
              to_chain_id: toToken.chain,
              to_token_id: toToken.id,
              to_token_amount: selectedBridgeQuote.to_token_amount,
              tx: tx,
              rabby_fee: selectedBridgeQuote.rabby_fee.usd_value,
              slippage: new BigNumber(slippage).div(100).toNumber(),
            },
            addHistoryData: {
              address: userAddress,
              fromChainId: findChainByEnum(fromToken.chain)?.id || 0,
              toChainId: findChainByEnum(toToken.chain)?.id || 0,
              fromToken: fromToken,
              toToken: toToken,
              fromAmount: Number(amount),
              toAmount: Number(selectedBridgeQuote.to_token_amount),
              slippage: new BigNumber(slippage).div(100).toNumber(),
              dexId: selectedBridgeQuote.aggregator.id,
              status: 'pending',
              createdAt: Date.now(),
            },
          },
          {
            ga: {
              category: 'Bridge',
              source: 'bridge',
              trigger: rbiSource,
            },
          }
        );
      } catch (error) {
        setQuotesList((pre) =>
          pre?.filter(
            (item) =>
              !(
                item?.aggregator?.id === selectedBridgeQuote?.aggregator?.id &&
                item?.bridge_id === selectedBridgeQuote?.bridge_id
              )
          )
        );
        message.error(error?.message || String(error));
        stats.report('bridgeQuoteResult', {
          aggregatorIds: selectedBridgeQuote.aggregator.id,
          bridgeId: selectedBridgeQuote.bridge_id,
          fromChainId: fromToken.chain,
          fromTokenId: fromToken.id,
          toTokenId: toToken.id,
          toChainId: toToken.chain,
          status: 'fail',
        });
        console.error(error);
      } finally {
        // setFetchingBridgeQuote(false);
      }
    }
  });

  const {
    data: txs,
    runAsync: runBuildSwapTxs,
    mutate: mutateTxs,
  } = useRequest(buildTxs, {
    manual: true,
  });

  const currentAccount = useCurrentAccount();

  const showLoss = useMemo(() => {
    const impact = tokenPriceImpact(
      fromToken,
      toToken,
      amount,
      selectedBridgeQuote?.to_token_amount
    );
    return !!impact?.showLoss;
  }, [fromToken, amount, selectedBridgeQuote?.to_token_amount, toToken]);

  const runBuildSwapTxsRef = useRef<ReturnType<typeof runBuildSwapTxs>>();

  const noQuote =
    inSufficientCanGetQuote &&
    !!fromToken &&
    !!toToken &&
    Number(amount) > 0 &&
    !quoteLoading &&
    !quoteList?.length;

  const btnDisabled =
    inSufficient ||
    !fromToken ||
    !toToken ||
    !amountAvailable ||
    !selectedBridgeQuote ||
    quoteLoading ||
    !quoteList?.length;

  const canUseDirectSubmitTx = useMemo(
    () => isSupportedChain && supportedDirectSign(currentAccount?.type || ''),

    [isSupportedChain, currentAccount?.type]
  );

  const noRiskSign =
    !toToken?.low_credit_score &&
    !toToken?.is_suspicious &&
    toToken?.is_verified !== false &&
    !isSlippageHigh &&
    !isSlippageLow &&
    !showLoss;

  const showRiskTips = isSlippageHigh || isSlippageLow || showLoss;

  const [miniSignLoading, setMiniSignLoading] = useState(false);

  const { openDirect, prefetch } = useMiniSigner({
    account: currentAccount!,
    chainServerId: findChainByEnum(fromChain)?.serverId || '',
    autoResetGasStoreOnChainChange: true,
  });

  const handleBridge = useMemoizedFn(async () => {
    if (canUseDirectSubmitTx) {
      setMiniSignLoading(true);
      setFetchingBridgeQuote(true);
      try {
        const buildPromise = runBuildSwapTxsRef.current || runBuildSwapTxs();
        runBuildSwapTxsRef.current = buildPromise;
        const builtTxs = await buildPromise;
        setFetchingBridgeQuote(false);
        if (!builtTxs?.length) {
          throw MINI_SIGN_ERROR.PREFETCH_FAILURE;
        }
        clearExpiredTimer();
        await openDirect({
          txs: builtTxs,
          getContainer,
          ga: {
            category: 'Bridge',
            source: 'bridge',
            trigger: rbiSource,
          },
          onPreExecError: () => {
            gotoBridge();
          },
        });
        mutateTxs([]);
        handleAmountChange('');
      } catch (error) {
        setFetchingBridgeQuote(false);
        if (error == MINI_SIGN_ERROR.USER_CANCELLED) {
          refresh((e) => e + 1);
          mutateTxs([]);
        } else if (error === MINI_SIGN_ERROR.CANT_PROCESS) {
          setTimeout(() => {
            refresh((e) => e + 1);
          }, 10 * 1000);
        } else {
          gotoBridge();
        }
        console.error('bridge direct sign error', error);
      } finally {
        setMiniSignLoading(false);
      }
    } else {
      gotoBridge();
    }
  });

  const history = useHistory();

  const twoStepApproveCn = useCss({
    '& .ant-modal-content': {
      background: '#fff',
    },
    '& .ant-modal-body': {
      padding: '12px 8px 32px 16px',
    },
    '& .ant-modal-confirm-content': {
      padding: '4px 0 0 0',
    },
    '& .ant-modal-confirm-btns': {
      justifyContent: 'center',
      '.ant-btn-primary': {
        width: '260px',
        height: '40px',
      },
      'button:first-child': {
        display: 'none',
      },
    },
  });

  useEffect(() => {
    if (!btnDisabled && selectedBridgeQuote) {
      mutateTxs([]);
      runBuildSwapTxsRef.current = runBuildSwapTxs();
    }
  }, [canUseDirectSubmitTx, btnDisabled, selectedBridgeQuote]);

  useEffect(() => {
    if (!canUseDirectSubmitTx) return;
    prefetch({
      txs: txs || [],
      getContainer,
      ga: {
        category: 'Bridge',
        source: 'bridge',
        trigger: rbiSource,
      },
    });
  }, [prefetch, txs, canUseDirectSubmitTx, rbiSource]);

  const [showMoreOpen, setShowMoreOpen] = useState(false);

  const switchFeePopup = useSetSettingVisible();

  const openFeePopup = useCallback(() => {
    switchFeePopup(true);
  }, [switchFeePopup]);

  const pendingTxRef = useRef<{ fetchHistory: () => void }>(null);

  return (
    <>
      <Header
        historyVisible={historyVisible}
        setHistoryVisible={setHistoryVisible}
        pendingNumber={pendingNumber}
        noShowHeader={isDesktop}
        onOpenInTab={() => {
          wallet.openInDesktop(
            `desktop/profile?${obj2query({
              action: 'bridge',
              fromChain: fromChain || '',
              fromTokenId: fromToken?.id || '',
              inputAmount: amount || '',
              toChain: toChain || '',
              toTokenId: toToken?.id || '',
              rbiSource: rbiSource || '',
              maxNativeTokenGasPrice: maxNativeTokenGasPrice
                ? String(maxNativeTokenGasPrice)
                : '',
            })}`
          );
        }}
      />
      <div
        className={clsx(
          'flex-1 overflow-auto page-has-ant-input',
          selectedBridgeQuote?.shouldApproveToken ? 'pb-[130px]' : 'pb-[110px]'
        )}
      >
        <div className="relative flex flex-col mx-20 gap-[6px]">
          <BridgeToken
            type="from"
            chain={fromChain}
            token={fromToken}
            onChangeToken={setFromToken}
            onChangeChain={switchFromChain}
            value={amount}
            onInputChange={handleAmountChange}
            excludeChains={toChain ? [toChain] : undefined}
            inSufficient={inSufficient}
            handleSetGasPrice={setMaxNativeTokenGasPrice}
            getContainer={getContainer}
            disabled={!isSupportedChain}
          />
          <BridgeToken
            type="to"
            chain={toChain}
            token={toToken}
            onChangeToken={setToToken}
            onChangeChain={setToChain}
            fromChainId={
              fromToken?.chain || findChainByEnum(fromChain)?.serverId
            }
            fromTokenId={fromToken?.id}
            valueLoading={quoteLoading}
            value={selectedBridgeQuote?.to_token_amount}
            excludeChains={fromChain ? [fromChain] : undefined}
            noQuote={noQuote}
            getContainer={getContainer}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <BridgeSwitchBtn onClick={switchToken} loading={quoteLoading} />
          </div>
        </div>
        {!isSupportedChain && fromChain && toChain ? (
          <div className="mt-16 mx-20">
            <ExternalSwapBridgeDappTips
              dappsAvailable={externalDapps?.length > 0}
            />
            <SwapBridgeDappPopup
              visible={externalDappOpen}
              onClose={() => {
                setExternalDappOpen(false);
              }}
              dappList={externalDapps}
              loading={externalDappsLoading}
            />
          </div>
        ) : null}

        {!inSufficientCanGetQuote || (noQuote && !recommendFromToken) ? (
          <Alert
            className={clsx(
              'mx-[20px] rounded-[4px] px-0 py-[3px] bg-transparent mt-6'
            )}
            icon={
              <RcIconWarningCC
                viewBox="0 0 16 16"
                className={clsx(
                  'relative top-[3px] mr-2 self-start origin-center w-16 h-15',
                  'text-rabby-red-default'
                )}
              />
            }
            banner
            message={
              <span
                className={clsx(
                  'text-13 font-medium',
                  'text-rabby-red-default'
                )}
              >
                {!inSufficientCanGetQuote
                  ? t('page.bridge.insufficient-balance')
                  : t('page.bridge.no-quote-found')}
              </span>
            }
          />
        ) : null}

        <div className="mx-20 mt-20">
          {selectedBridgeQuote && (
            <BridgeShowMore
              supportDirectSign={canUseDirectSubmitTx}
              openFeePopup={openFeePopup}
              open={showMoreOpen}
              setOpen={setShowMoreOpen}
              sourceName={selectedBridgeQuote?.aggregator.name || ''}
              sourceLogo={selectedBridgeQuote?.aggregator.logo_url || ''}
              slippage={slippageState}
              displaySlippage={slippage}
              onSlippageChange={(e) => {
                setSlippageChanged(true);
                setSlippage(e);
              }}
              fromToken={fromToken}
              toToken={toToken}
              amount={amount || 0}
              toAmount={selectedBridgeQuote?.to_token_amount}
              openQuotesList={openQuotesList}
              quoteLoading={quoteLoading}
              slippageError={isSlippageHigh || isSlippageLow}
              autoSlippage={autoSlippage}
              isCustomSlippage={isCustomSlippage}
              setAutoSlippage={setAutoSlippage}
              setIsCustomSlippage={setIsCustomSlippage}
              type="bridge"
              isBestQuote={
                !!bestQuoteId &&
                !!selectedBridgeQuote &&
                bestQuoteId?.aggregatorId ===
                  selectedBridgeQuote.aggregator.id &&
                bestQuoteId?.bridgeId === selectedBridgeQuote.bridge_id
              }
            />
          )}
          {noQuote && recommendFromToken && (
            <RecommendFromToken
              token={recommendFromToken}
              className="mt-16"
              onOk={fillRecommendFromToken}
            />
          )}
        </div>
        {!selectedBridgeQuote && !recommendFromToken && (
          <div className="mt-20 mx-20">
            <PendingTxItem
              type="bridge"
              bridgeHistoryList={historyList}
              openBridgeHistory={() => setHistoryVisible(true)}
              ref={pendingTxRef}
            />
          </div>
        )}

        <div
          className={clsx(
            'fixed w-full bottom-0 mt-auto flex flex-col items-center justify-center p-20 gap-12',
            'bg-r-neutral-bg-2 border border-t-[0.5px] border-transparent border-t-rabby-neutral-line',
            'py-[16px]',
            isTab ? 'rounded-b-[16px]' : ''
          )}
        >
          {(fromChain as string) === 'DBK' ? (
            <DbkButton
              className="h-[48px] w-full text-[16px] font-medium bg-r-orange-DBK border-transparent rounded-[6px]"
              onClick={() => {
                history.push(
                  `/ecology/${DBK_CHAIN_ID}/bridge?activeTab=withdraw`
                );
              }}
            >
              {t('page.bridge.bridgeDbkBtn')}
            </DbkButton>
          ) : (
            <TooltipWithMagnetArrow
              overlayClassName="rectangle w-[max-content]"
              title={
                !isSupportedChain && externalDapps.length < 1
                  ? t('component.externalSwapBrideDappPopup.noDapps')
                  : t('page.swap.insufficient-balance')
              }
              visible={
                !isSupportedChain && externalDapps.length < 1
                  ? undefined
                  : inSufficient && selectedBridgeQuote
                  ? undefined
                  : false
              }
            >
              {canUseDirectSubmitTx &&
              currentAccount?.type &&
              isSupportedChain ? (
                <DirectSignToConfirmBtn
                  disabled={btnDisabled}
                  title={t('page.bridge.title')}
                  onConfirm={handleBridge}
                  showRiskTips={showRiskTips && !btnDisabled}
                  accountType={currentAccount?.type}
                  riskReset={btnDisabled}
                  loading={miniSignLoading}
                />
              ) : (
                <Button
                  loading={fetchingBridgeQuote}
                  type="primary"
                  block
                  size="large"
                  className="h-[48px] text-white text-[16px] font-medium"
                  onClick={() => {
                    if (showExternalDappTips && externalDapps.length > 0) {
                      setExternalDappOpen(true);
                      return;
                    }
                    if (fetchingBridgeQuote) return;
                    if (!selectedBridgeQuote) {
                      refresh((e) => e + 1);

                      return;
                    }
                    if (selectedBridgeQuote?.shouldTwoStepApprove) {
                      return Modal.confirm({
                        width: 360,
                        closable: true,
                        centered: true,
                        className: twoStepApproveCn,
                        title: null,
                        content: (
                          <>
                            <div className="text-[16px] font-medium text-r-neutral-title-1 mb-18 text-center">
                              Sign 2 transactions to change allowance
                            </div>
                            <div className="text-13 leading-[17px]  text-r-neutral-body">
                              Token USDT requires 2 transactions to change
                              allowance. First you would need to reset allowance
                              to zero, and only then set new allowance value.
                            </div>
                          </>
                        ),
                        okText: 'Proceed with two step approve',

                        onOk() {
                          // gotoBridge();
                          handleBridge();
                        },
                      });
                    }
                    // gotoBridge();
                    handleBridge();
                  }}
                  disabled={
                    !isSupportedChain && externalDapps.length > 0
                      ? false
                      : canUseDirectSubmitTx
                      ? btnDisabled
                      : btnDisabled
                  }
                >
                  {btnText}
                </Button>
              )}
            </TooltipWithMagnetArrow>
          )}
        </div>
        {fromToken && toToken ? (
          <QuoteList
            list={quoteList}
            loading={quoteLoading}
            visible={visible}
            onClose={() => {
              setVisible(false);
            }}
            userAddress={userAddress}
            payToken={fromToken}
            payAmount={amount}
            receiveToken={toToken}
            inSufficient={inSufficient}
            setSelectedBridgeQuote={setSelectedBridgeQuote}
            getContainer={getContainer}
          />
        ) : null}
      </div>
    </>
  );
};
