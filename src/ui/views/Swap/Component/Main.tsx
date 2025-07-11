import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRabbySelector } from '@/ui/store';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { useDetectLoss, useTokenPair } from '../hooks/token';
import { Alert, Button, Input, Modal } from 'antd';
import BigNumber from 'bignumber.js';
import { getUiType, openInternalPageInTab, useWallet } from '@/ui/utils';
import clsx from 'clsx';
import { QuoteList } from './Quotes';
import {
  useQuoteVisible,
  useSetQuoteVisible,
  useSetRabbyFee,
  useSetRefreshId,
} from '../hooks';
import { DEX_ENUM, DEX_SPENDER_WHITELIST } from '@rabby-wallet/rabby-swap';
import { useDispatch } from 'react-redux';
import { useRbiSource } from '@/ui/utils/ga-event';
import { useCss, useDebounce } from 'react-use';
import { DEX_WITH_WRAP, KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import ChainSelectorInForm from '@/ui/component/ChainSelector/InForm';
import { findChain, findChainByEnum, findChainByServerID } from '@/utils/chain';
import type { SelectChainItemProps } from '@/ui/component/ChainSelector/components/SelectChainItem';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { MiniApproval } from '../../Approval/components/MiniSignTx';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useHistory } from 'react-router-dom';
import { LowCreditModal } from './LowCreditModal';
import { SwapTokenItem } from './Token';
import { BridgeSwitchBtn } from '../../Bridge/Component/BridgeSwitchButton';
import { BridgeShowMore } from '../../Bridge/Component/BridgeShowMore';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import useDebounceValue from '@/ui/hooks/useDebounceValue';
import { Header } from './Header';
import { obj2query } from '@/ui/utils/url';
import { SWAP_SLIPPAGE } from '../../Bridge/Component/BridgeSlippage';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useExternalSwapBridgeDapps } from '@/ui/component/ExternalSwapBridgeDappPopup/hooks';
import {
  ExternalSwapBridgeDappTips,
  SwapBridgeDappPopup,
} from '@/ui/component/ExternalSwapBridgeDappPopup';

const isTab = getUiType().isTab;
const getContainer = isTab ? '.js-rabby-popup-container' : undefined;

const getDisabledTips: SelectChainItemProps['disabledTips'] = (ctx) => {
  const chainItem = findChainByServerID(ctx.chain.serverId);

  if (chainItem?.isTestnet) return i18n.t('page.swap.testnet-is-not-supported');

  return i18n.t('page.swap.not-supported');
};

export const Main = () => {
  const { userAddress } = useRabbySelector((state) => ({
    userAddress: state.account.currentAccount?.address || '',
    unlimitedAllowance: state.swap.unlimitedAllowance || false,
  }));

  const dispatch = useDispatch();

  const {
    passGasPrice,
    bestQuoteDex,
    chain,
    switchChain,

    gasLevel,
    gasList,

    payToken,
    setPayToken,
    receiveToken,
    setReceiveToken,
    exchangeToken,

    handleAmountChange,

    inputAmount,

    payTokenIsNativeToken,
    isWrapToken,
    inSufficient,

    slippageState,
    isSlippageHigh,
    isSlippageLow,
    slippage,
    setSlippage,
    autoSlippage,
    isCustomSlippage,
    setAutoSlippage,
    setIsCustomSlippage,

    feeRate,

    openQuotesList,
    quoteLoading,
    quoteList,

    currentProvider: activeProvider,
    setActiveProvider,
    slippageValidInfo,
    slider,
    swapUseSlider,
    onChangeSlider,

    clearExpiredTimer,
    lowCreditToken,
    lowCreditVisible,
    setLowCreditToken,
    setLowCreditVisible,
    showMoreVisible,
    inSufficientCanGetQuote,

    autoSuggestSlippage,
    setAutoSuggestSlippage,
  } = useTokenPair(userAddress);

  const {
    isSupportedChain,
    data: externalDapps,
    loading: externalDappsLoading,
  } = useExternalSwapBridgeDapps(chain, 'swap');

  const refresh = useSetRefreshId();

  const originPreferMEVGuarded = useRabbySelector(
    (s) => !!s.swap.preferMEVGuarded
  );

  const showMEVGuardedSwitch = useMemo(() => chain === CHAINS_ENUM.ETH, [
    chain,
  ]);

  const switchPreferMEV = useCallback((bool: boolean) => {
    dispatch.swap.setSwapPreferMEV(bool);
  }, []);

  const preferMEVGuarded = useMemo(
    () => (chain === CHAINS_ENUM.ETH ? originPreferMEVGuarded : false),
    [chain, originPreferMEVGuarded]
  );

  const inputRef = useRef<Input>();

  useLayoutEffect(() => {
    if (payToken?.id) {
      inputRef.current?.focus();
    }
  }, [payToken?.id]);

  const visible = useQuoteVisible();
  const setVisible = useSetQuoteVisible();
  const { t } = useTranslation();

  const amountAvailable = useMemo(() => Number(inputAmount) > 0, [inputAmount]);

  const btnText = useMemo(() => {
    if (!isSupportedChain) {
      return t('component.externalSwapBrideDappPopup.swapOnDapp');
    }
    if (activeProvider?.shouldApproveToken) {
      return t('page.swap.approve-swap');
    }

    if (quoteLoading) {
      return t('page.swap.title');
    }

    return t('page.swap.title');
  }, [
    activeProvider?.shouldApproveToken,
    quoteLoading,
    isSupportedChain,
    externalDapps,
  ]);

  const wallet = useWallet();
  const rbiSource = useRbiSource();

  const [isShowSign, setIsShowSign] = useState(false);
  const { runAsync: gotoSwap, loading: isSubmitLoading } = useRequest(
    async () => {
      if (!inSufficient && payToken && receiveToken && activeProvider?.quote) {
        try {
          const promise = wallet.dexSwap(
            {
              swapPreferMEVGuarded: preferMEVGuarded,
              chain,
              quote: activeProvider?.quote,
              needApprove: activeProvider.shouldApproveToken,
              spender:
                activeProvider?.name === DEX_ENUM.WRAPTOKEN
                  ? ''
                  : DEX_SPENDER_WHITELIST[activeProvider.name][chain],
              pay_token_id: payToken.id,
              unlimited: false,
              shouldTwoStepApprove: activeProvider.shouldTwoStepApprove,
              gasPrice:
                payTokenIsNativeToken && passGasPrice
                  ? gasList?.find((e) => e.level === gasLevel)?.price
                  : undefined,
              postSwapParams: {
                quote: {
                  pay_token_id: payToken.id,
                  pay_token_amount: Number(inputAmount),
                  receive_token_id: receiveToken!.id,
                  receive_token_amount: new BigNumber(
                    activeProvider?.quote.toTokenAmount
                  )
                    .div(
                      10 **
                        (activeProvider?.quote.toTokenDecimals ||
                          receiveToken.decimals)
                    )
                    .toNumber(),
                  slippage: new BigNumber(slippage).div(100).toNumber(),
                },
                dex_id: activeProvider?.name || 'WrapToken',
              },
            },
            {
              ga: {
                category: 'Swap',
                source: 'swap',
                trigger: rbiSource,
                swapUseSlider,
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
          console.error(error);
        }
      }
    },
    {
      manual: true,
    }
  );

  const buildSwapTxs = useMemoizedFn(async () => {
    if (!inSufficient && payToken && receiveToken && activeProvider?.quote) {
      try {
        const result = await wallet.buildDexSwap(
          {
            swapPreferMEVGuarded: preferMEVGuarded,
            chain,
            quote: activeProvider?.quote,
            needApprove: activeProvider.shouldApproveToken,
            spender:
              activeProvider?.name === DEX_ENUM.WRAPTOKEN
                ? ''
                : DEX_SPENDER_WHITELIST[activeProvider.name][chain],
            pay_token_id: payToken.id,
            unlimited: false,
            shouldTwoStepApprove: activeProvider.shouldTwoStepApprove,
            gasPrice:
              payTokenIsNativeToken && passGasPrice
                ? gasList?.find((e) => e.level === gasLevel)?.price
                : undefined,
            postSwapParams: {
              quote: {
                pay_token_id: payToken.id,
                pay_token_amount: Number(inputAmount),
                receive_token_id: receiveToken!.id,
                receive_token_amount: new BigNumber(
                  activeProvider?.quote.toTokenAmount
                )
                  .div(
                    10 **
                      (activeProvider?.quote.toTokenDecimals ||
                        receiveToken.decimals)
                  )
                  .toNumber(),
                slippage: new BigNumber(slippage).div(100).toNumber(),
              },
              dex_id: activeProvider?.name || 'WrapToken',
            },
          },
          {
            ga: {
              category: 'Swap',
              source: 'swap',
              trigger: rbiSource,
              swapUseSlider,
            },
          }
        );
        return result;
      } catch (error) {
        console.error(error);
      }
    }
  });

  const {
    data: txs,
    runAsync: runBuildSwapTxs,
    mutate: mutateTxs,
  } = useRequest(buildSwapTxs, {
    manual: true,
  });

  const currentAccount = useCurrentAccount();

  const showLoss = useDetectLoss({
    payToken: payToken,
    payAmount: inputAmount,
    receiveRawAmount: activeProvider?.actualReceiveAmount || 0,
    receiveToken: receiveToken,
  });

  const canUseMiniTx = useMemo(
    () =>
      [
        KEYRING_TYPE.SimpleKeyring,
        KEYRING_TYPE.HdKeyring,
        KEYRING_CLASS.HARDWARE.LEDGER,
      ].includes((currentAccount?.type || '') as any) &&
      !receiveToken?.low_credit_score &&
      !receiveToken?.is_suspicious &&
      receiveToken?.is_verified !== false &&
      !isSlippageHigh &&
      !isSlippageLow &&
      !showLoss,
    [
      receiveToken,
      isSlippageHigh,
      isSlippageLow,
      showLoss,
      currentAccount?.type,
    ]
  );

  const [swapDappOpen, setSwapDappOpen] = useState(false);

  const handleSwap = useMemoizedFn(() => {
    if (!isTab) {
      dispatch.swap.setRecentSwapToToken(receiveToken);
    }
    if (!isSupportedChain) {
      setSwapDappOpen(true);
      return;
    }
    if (canUseMiniTx) {
      setIsShowSign(true);
      clearExpiredTimer();
    } else {
      gotoSwap();
    }
  });

  const swapBtnDisabled = isSupportedChain
    ? quoteLoading ||
      !payToken ||
      !receiveToken ||
      !amountAvailable ||
      inSufficient ||
      !activeProvider
    : externalDapps.length
    ? false
    : true;

  useEffect(() => {
    if (!swapBtnDisabled && activeProvider) {
      if (canUseMiniTx) {
        mutateTxs([]);
        runBuildSwapTxs();
      }
    }
  }, [swapBtnDisabled, canUseMiniTx, activeProvider]);

  const history = useHistory();

  useEffect(() => {
    setLowCreditToken(receiveToken);
  }, [receiveToken]);

  useEffect(() => {
    if (
      receiveToken?.chain &&
      receiveToken?.id &&
      receiveToken?.low_credit_score
    ) {
      setLowCreditVisible(true);
    }
  }, [receiveToken?.id, receiveToken?.chain, receiveToken?.low_credit_score]);

  useEffect(() => {
    if (
      lowCreditVisible &&
      (!receiveToken?.id || !receiveToken?.low_credit_score)
    ) {
      setLowCreditVisible(false);
    }
  }, [lowCreditVisible, receiveToken?.id, receiveToken?.low_credit_score]);

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

  const [showMoreOpen, setShowMoreOpen] = useState(false);

  const [sourceName, sourceLogo] = useMemo(() => {
    if (activeProvider?.name) {
      if (isWrapToken) {
        return [t('page.swap.wrap-contract'), receiveToken?.logo_url];
      }
      const currentDex = DEX_WITH_WRAP[activeProvider.name];
      return [currentDex.name, currentDex.logo];
    }
    return ['', ''];
  }, [isWrapToken, activeProvider?.name]);

  const noQuoteOrigin = useMemo(
    () =>
      Number(inputAmount) > 0 &&
      inSufficientCanGetQuote &&
      amountAvailable &&
      !quoteLoading &&
      !!payToken &&
      !!receiveToken &&
      !activeProvider,
    [
      inputAmount,
      inSufficientCanGetQuote,
      amountAvailable,
      quoteLoading,
      payToken,
      receiveToken,
      activeProvider,
    ]
  );

  const noQuote = useDebounceValue(noQuoteOrigin, 10);

  useEffect(() => {
    if (noQuote) {
      setShowMoreOpen(true);
    }
  }, [noQuote]);

  useDebounce(
    () => {
      if (
        !isWrapToken &&
        Number(inputAmount) > 0 &&
        inSufficientCanGetQuote &&
        amountAvailable &&
        !quoteLoading &&
        !!payToken &&
        !!receiveToken &&
        activeProvider &&
        Number(slippage) >= Number(SWAP_SLIPPAGE[1])
      ) {
        setShowMoreOpen(true);
      }
    },
    10,
    [
      showMoreVisible,
      isWrapToken,
      inputAmount,
      inSufficientCanGetQuote,
      amountAvailable,
      payToken,
      receiveToken,
      activeProvider,
      autoSlippage,
      activeProvider,
      quoteLoading,
    ]
  );

  const setRabbyFeeVisible = useSetRabbyFee();

  const openFeePopup = useCallback(() => {
    if (isWrapToken) {
      return;
    }
    setRabbyFeeVisible({
      visible: true,
      dexName: activeProvider?.name || undefined,
      feeDexDesc: activeProvider?.quote?.dexFeeDesc || undefined,
    });
  }, [
    isWrapToken,
    setRabbyFeeVisible,
    activeProvider?.name,
    activeProvider?.quote,
  ]);

  return (
    <>
      <Header
        onOpenInTab={() => {
          openInternalPageInTab(
            `dex-swap?${obj2query({
              chain:
                findChain({
                  enum: chain,
                })?.serverId || '',
              payTokenId: payToken?.id || '',
              receiveTokenId: receiveToken?.id || '',
              inputAmount,
              isMax: slider >= 100 ? 'true' : '',
              rbiSource,
            })}`
          );
        }}
      />
      <div
        className={clsx('flex-1 overflow-auto page-has-ant-input', 'pb-[76px]')}
      >
        <div className="mb-8 mx-20">
          <ChainSelectorInForm
            swap
            value={chain}
            onChange={switchChain}
            disabledTips={getDisabledTips}
            // supportChains={SWAP_SUPPORT_CHAINS}
            hideTestnetTab={true}
            chainRenderClassName={clsx(
              'text-[13px] font-medium border-0',
              'before:border-transparent hover:before:border-rabby-blue-default'
            )}
            drawerHeight={540}
            showClosableIcon
            getContainer={getContainer}
          />
        </div>

        <div
          className={clsx('relative bg-r-neutral-card-1 rounded-[8px] mx-20')}
        >
          <SwapTokenItem
            inSufficient={inSufficient}
            slider={slider}
            onChangeSlider={onChangeSlider}
            value={inputAmount}
            onValueChange={handleAmountChange}
            token={payToken}
            onTokenChange={(token) => {
              const chainItem = findChainByServerID(token.chain);
              if (chainItem?.enum !== chain) {
                switchChain(chainItem?.enum || CHAINS_ENUM.ETH);
                setReceiveToken(undefined);
              }
              setPayToken(token);
            }}
            chainId={findChainByEnum(chain)!.serverId}
            type={'from'}
            excludeTokens={receiveToken?.id ? [receiveToken?.id] : undefined}
            getContainer={getContainer}
            disabled={!isSupportedChain}
          />

          <div
            className={clsx(
              'w-full h-[0.5px] bg-rabby-neutral-line',
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
            )}
          />

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <BridgeSwitchBtn
              onClick={exchangeToken}
              loading={
                quoteLoading &&
                amountAvailable &&
                inSufficientCanGetQuote &&
                !activeProvider?.manualClick
              }
            />
          </div>

          <SwapTokenItem
            valueLoading={
              quoteLoading &&
              amountAvailable &&
              inSufficientCanGetQuote &&
              !activeProvider?.manualClick
            }
            value={
              !activeProvider
                ? ''
                : activeProvider?.actualReceiveAmount
                ? activeProvider?.actualReceiveAmount + ''
                : activeProvider?.name === 'WrapToken'
                ? inputAmount
                : '0'
            }
            token={receiveToken}
            onTokenChange={(token) => {
              const chainItem = findChainByServerID(token.chain);
              if (chainItem?.enum !== chain) {
                switchChain(chainItem?.enum || CHAINS_ENUM.ETH);
                setPayToken(undefined);
              }
              setReceiveToken(token);
            }}
            chainId={findChainByEnum(chain)!.serverId || CHAINS[chain].serverId}
            type={'to'}
            excludeTokens={payToken?.id ? [payToken?.id] : undefined}
            currentQuote={activeProvider}
            getContainer={getContainer}
          />
        </div>

        {!isSupportedChain ? (
          <div className="mt-16 mx-20">
            <ExternalSwapBridgeDappTips
              dappsAvailable={externalDapps.length > 0}
            />
            <SwapBridgeDappPopup
              visible={swapDappOpen}
              onClose={() => {
                setSwapDappOpen(false);
              }}
              dappList={externalDapps}
              loading={externalDappsLoading}
            />
          </div>
        ) : null}

        {!inSufficientCanGetQuote || noQuote ? (
          <Alert
            className={clsx(
              'mx-[20px] rounded-[4px] px-0 py-[3px] bg-transparent mt-6'
            )}
            icon={
              <RcIconWarningCC
                viewBox="0 0 16 16"
                className={clsx(
                  'relative top-[3px] mr-4 self-start origin-center w-16 h-15',
                  'text-rabby-red-default'
                )}
              />
            }
            banner
            message={
              <span
                className={clsx(
                  'text-13 leading-[16px]',
                  'text-rabby-red-default'
                )}
              >
                {!inSufficientCanGetQuote
                  ? t('page.swap.insufficient-balance')
                  : t('page.swap.no-quote-found')}
              </span>
            }
          />
        ) : null}

        {showMoreVisible &&
          Number(inputAmount) > 0 &&
          inSufficientCanGetQuote &&
          !!amountAvailable &&
          !!payToken &&
          !!receiveToken && (
            <div className={clsx('mx-20 mb-20', noQuote ? 'mt-12' : 'mt-20')}>
              <BridgeShowMore
                autoSuggestSlippage={autoSuggestSlippage}
                openFeePopup={openFeePopup}
                open={showMoreOpen}
                setOpen={setShowMoreOpen}
                sourceName={sourceName}
                sourceLogo={sourceLogo}
                slippage={slippageState}
                displaySlippage={slippage}
                onSlippageChange={setSlippage}
                fromToken={payToken}
                toToken={receiveToken}
                amount={inputAmount}
                toAmount={
                  isWrapToken
                    ? inputAmount
                    : activeProvider?.actualReceiveAmount || 0
                }
                openQuotesList={openQuotesList}
                quoteLoading={quoteLoading}
                slippageError={isSlippageHigh || isSlippageLow}
                autoSlippage={!!autoSlippage}
                isCustomSlippage={isCustomSlippage}
                setAutoSlippage={setAutoSlippage}
                setIsCustomSlippage={setIsCustomSlippage}
                type="swap"
                isWrapToken={isWrapToken}
                isBestQuote={
                  !!activeProvider &&
                  !!bestQuoteDex &&
                  bestQuoteDex === activeProvider?.name
                }
                showMEVGuardedSwitch={showMEVGuardedSwitch}
                originPreferMEVGuarded={originPreferMEVGuarded}
                switchPreferMEV={switchPreferMEV}
                recommendValue={
                  slippageValidInfo?.is_valid
                    ? undefined
                    : slippageValidInfo?.suggest_slippage
                }
              />
            </div>
          )}

        <div
          className={clsx(
            'fixed w-full bottom-0 mt-auto flex flex-col items-center justify-center p-20 gap-10',
            'bg-r-neutral-bg-2 border border-t-[0.5px] border-transparent border-t-rabby-neutral-line',
            'py-[13px]',
            isTab ? 'rounded-b-[16px]' : ''
          )}
        >
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
                : inSufficient && activeProvider
                ? undefined
                : false
            }
          >
            <Button
              type="primary"
              block
              size="large"
              className="h-[48px] text-white text-[16px] font-medium"
              loading={isSubmitLoading}
              onClick={() => {
                if (!isSupportedChain && externalDapps.length > 0) {
                  setSwapDappOpen(true);
                  return;
                }
                if (!activeProvider) {
                  refresh((e) => e + 1);
                  return;
                }
                if (activeProvider?.shouldTwoStepApprove) {
                  return Modal.confirm({
                    width: 360,
                    closable: true,
                    centered: true,
                    className: twoStepApproveCn,
                    title: null,
                    content: (
                      <>
                        <div className="text-[16px] font-medium text-r-neutral-title-1 mb-18 text-center">
                          {t('page.swap.two-step-approve')}
                        </div>
                        <div className="text-13 leading-[17px]  text-r-neutral-body">
                          {t('page.swap.two-step-approve-details')}
                        </div>
                      </>
                    ),
                    okText: t('page.swap.process-with-two-step-approve'),
                    onOk() {
                      // gotoSwap();
                      handleSwap();
                    },
                  });
                }
                // gotoSwap();
                // runBuildSwapTxs();
                handleSwap();
              }}
              disabled={swapBtnDisabled}
            >
              {btnText}
            </Button>
          </TooltipWithMagnetArrow>
        </div>

        {payToken && receiveToken && chain ? (
          <QuoteList
            list={quoteList}
            loading={quoteLoading}
            visible={visible}
            onClose={() => {
              setVisible(false);
            }}
            userAddress={userAddress}
            chain={chain}
            slippage={slippage}
            payToken={payToken}
            payAmount={inputAmount}
            receiveToken={receiveToken}
            fee={feeRate}
            inSufficient={inSufficient}
            setActiveProvider={setActiveProvider}
            getContainer={getContainer}
          />
        ) : null}
        <MiniApproval
          visible={isShowSign}
          txs={txs}
          ga={{
            category: 'Swap',
            source: 'swap',
            trigger: rbiSource,
            swapUseSlider,
          }}
          onClose={() => {
            setIsShowSign(false);
            refresh((e) => e + 1);
            setTimeout(() => {
              mutateTxs([]);
            }, 500);
          }}
          onReject={() => {
            setIsShowSign(false);
            refresh((e) => e + 1);
            mutateTxs([]);
          }}
          onResolve={() => {
            setTimeout(() => {
              setIsShowSign(false);
              mutateTxs([]);
              // setPayAmount('');
              // setTimeout(() => {
              if (!isTab) {
                history.replace('/');
              }
              handleAmountChange('');
              // }, 500);
            }, 500);
          }}
          getContainer={getContainer}
        />
        <LowCreditModal
          token={lowCreditToken}
          visible={lowCreditVisible}
          onCancel={() => {
            setLowCreditVisible(false);
          }}
        />
      </div>
    </>
  );
};
