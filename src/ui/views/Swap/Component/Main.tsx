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
import TokenSelect from '@/ui/component/TokenSelect';
import { ReactComponent as IconSwapArrow } from '@/ui/assets/swap/swap-arrow.svg';
import { TokenRender } from './TokenRender';
import { useDetectLoss, useTokenPair } from '../hooks/token';
import { Alert, Button, Input, Modal, Switch, Tooltip } from 'antd';
import BigNumber from 'bignumber.js';
import { formatAmount, formatUsdValue, useWallet } from '@/ui/utils';
import styled from 'styled-components';
import clsx from 'clsx';
import { QuoteList } from './Quotes';
import { useQuoteVisible, useSetQuoteVisible, useSetRefreshId } from '../hooks';
import { InfoCircleFilled } from '@ant-design/icons';
import { ReceiveDetails } from './ReceiveDetail';
import { Slippage } from './Slippage';
import { DEX_ENUM, DEX_SPENDER_WHITELIST } from '@rabby-wallet/rabby-swap';
import { useDispatch } from 'react-redux';
import { useRbiSource } from '@/ui/utils/ga-event';
import { useCss } from 'react-use';
import {
  DEX,
  KEYRING_CLASS,
  KEYRING_TYPE,
  SWAP_SUPPORT_CHAINS,
} from '@/constant';
import { getTokenSymbol } from '@/ui/utils/token';
import ChainSelectorInForm from '@/ui/component/ChainSelector/InForm';
import { findChainByServerID } from '@/utils/chain';
import type { SelectChainItemProps } from '@/ui/component/ChainSelector/components/SelectChainItem';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { BestQuoteLoading } from './loading';
import { MaxButton } from '../../SendToken/components/MaxButton';
import { ReserveGasPopup } from './ReserveGasPopup';
import GasSelectorHeader, {
  GasSelectorResponse,
} from '../../Approval/components/TxComponents/GasSelectorHeader';
import { MiniApproval, MiniSignTx } from '../../Approval/components/MiniSignTx';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useHistory } from 'react-router-dom';
import { LowCreditModal, useLowCreditState } from './LowCreditModal';

const tipsClassName = clsx('text-r-neutral-body text-12 mb-8 pt-14');

const StyledInput = styled(Input)`
  height: 46px;
  font-weight: 500;
  font-size: 18px;
  box-shadow: none;
  border-radius: 4px;
  border: 1px solid var(--r-neutral-line, #d3d8e0);
  background: transparent !important;
  & > .ant-input {
    font-weight: 500;
    font-size: 18px;
    border-width: 0px !important;
    border-color: transparent;
  }
  &.ant-input-affix-wrapper:not(.ant-input-affix-wrapper-disabled):hover {
    border-width: 1px !important;
  }

  &:active {
    border: 1px solid transparent;
  }
  &:focus,
  &:focus-within {
    border-width: 1px !important;
    border-color: var(--r-blue-default, #7084ff) !important;
  }
  &:hover {
    border-width: 1px !important;
    border-color: var(--r-blue-default, #7084ff) !important;
    box-shadow: none;
  }

  &:placeholder-shown {
    color: #707280;
  }
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const PreferMEVGuardSwitch = styled(Switch)`
  min-width: 20px;
  height: 12px;

  &.ant-switch-checked {
    background-color: var(--r-blue-default, #7084ff);
    .ant-switch-handle {
      left: calc(100% - 10px - 1px);
      top: 1px;
    }
  }
  .ant-switch-handle {
    height: 10px;
    width: 10px;
    top: 1px;
    left: 1px;
  }
`;

const getDisabledTips: SelectChainItemProps['disabledTips'] = (ctx) => {
  const chainItem = findChainByServerID(ctx.chain.serverId);

  if (chainItem?.isTestnet) return i18n.t('page.swap.testnet-is-not-supported');

  return i18n.t('page.swap.not-supported');
};

export const Main = () => {
  const { userAddress, unlimitedAllowance } = useRabbySelector((state) => ({
    userAddress: state.account.currentAccount?.address || '',
    unlimitedAllowance: state.swap.unlimitedAllowance || false,
  }));

  const dispatch = useDispatch();

  const {
    passGasPrice,
    bestQuoteDex,
    chain,
    switchChain,
    reserveGasOpen,
    closeReserveGasOpen,
    gasLevel,
    changeGasPrice,
    gasLimit,
    gasList,

    payToken,
    setPayToken,
    receiveToken,
    setReceiveToken,
    exchangeToken,

    handleAmountChange,
    setPayAmount,
    handleBalance,
    inputAmount,
    debouncePayAmount,

    payTokenIsNativeToken,
    isWrapToken,
    inSufficient,
    slippageChanged,
    setSlippageChanged,
    slippageState,
    isSlippageHigh,
    isSlippageLow,
    slippage,
    setSlippage,

    feeRate,

    openQuotesList,
    quoteLoading,
    quoteList,

    currentProvider: activeProvider,
    setActiveProvider,
    slippageValidInfo,
    expired,
  } = useTokenPair(userAddress);

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
    if ((payToken?.id, receiveToken?.id)) {
      inputRef.current?.focus();
    }
  }, [payToken?.id, receiveToken?.id]);

  const DexDisplayName = useMemo(
    () => DEX?.[activeProvider?.name as keyof typeof DEX]?.name || '',
    [activeProvider?.name]
  );

  const visible = useQuoteVisible();
  const setVisible = useSetQuoteVisible();
  const { t } = useTranslation();

  const payAmountLoading = useMemo(() => inputAmount !== debouncePayAmount, [
    inputAmount,
    debouncePayAmount,
  ]);

  const quoteOrAmountLoading = quoteLoading || payAmountLoading;

  const amountAvailable = useMemo(() => Number(debouncePayAmount) > 0, [
    debouncePayAmount,
  ]);

  const btnText = useMemo(() => {
    if (slippageChanged) {
      return t('page.swap.slippage-adjusted-refresh-quote');
    }
    if (activeProvider && expired) {
      return t('page.swap.price-expired-refresh-quote');
    }
    if (activeProvider?.shouldApproveToken) {
      return t('page.swap.approve-and-swap', { name: DexDisplayName });
    }
    if (activeProvider?.name) {
      return t('page.swap.swap-via-x', {
        name: isWrapToken ? 'Wrap Contract' : DexDisplayName,
      });
    }
    if (quoteOrAmountLoading) {
      return t('page.swap.title');
    }

    return t('page.swap.title');
  }, [
    slippageChanged,
    activeProvider,
    expired,
    payToken,
    isWrapToken,
    DexDisplayName,
    quoteOrAmountLoading,
  ]);

  const wallet = useWallet();
  const rbiSource = useRbiSource();

  const [isShowSign, setIsShowSign] = useState(false);
  const gotoSwap = useCallback(async () => {
    if (!inSufficient && payToken && receiveToken && activeProvider?.quote) {
      try {
        wallet.dexSwap(
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
                pay_token_amount: Number(debouncePayAmount),
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
            },
          }
        );
        window.close();
      } catch (error) {
        console.error(error);
      }
    }
  }, [
    payTokenIsNativeToken,
    gasList,
    gasLevel,
    preferMEVGuarded,
    inSufficient,
    payToken,
    unlimitedAllowance,
    activeProvider?.quote,
    wallet?.dexSwap,
    activeProvider?.shouldApproveToken,
    activeProvider?.name,
    activeProvider?.shouldTwoStepApprove,
  ]);

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
                pay_token_amount: Number(debouncePayAmount),
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
    payAmount: debouncePayAmount,
    receiveRawAmount: activeProvider?.actualReceiveAmount || 0,
    receiveToken: receiveToken,
  });

  const handleSwap = useMemoizedFn(() => {
    if (
      [
        KEYRING_TYPE.SimpleKeyring,
        KEYRING_TYPE.HdKeyring,
        KEYRING_CLASS.HARDWARE.LEDGER,
      ].includes((currentAccount?.type || '') as any) &&
      !receiveToken?.low_credit_score &&
      !isSlippageHigh &&
      !isSlippageLow &&
      !showLoss
    ) {
      runBuildSwapTxs();
      setIsShowSign(true);
    } else {
      gotoSwap();
    }
  });

  const history = useHistory();

  const {
    lowCreditToken,
    lowCreditVisible,
    setLowCreditToken,
    setLowCreditVisible,
  } = useLowCreditState(receiveToken);

  const lowCreditInit = useRef(false);

  useEffect(() => {
    if (
      receiveToken &&
      receiveToken?.low_credit_score &&
      !lowCreditInit.current
    ) {
      setLowCreditToken(receiveToken);
      setLowCreditVisible(true);
    }
  }, [receiveToken]);

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

  const FeeAndMEVGuarded = useMemo(
    () => (
      <>
        {showMEVGuardedSwitch && (
          <div className="flex justify-between items-center">
            <Tooltip
              placement={'topLeft'}
              overlayClassName={clsx('rectangle', 'max-w-[312px]')}
              title={t('page.swap.preferMEVTip')}
            >
              <span>{t('page.swap.preferMEV')}</span>
            </Tooltip>
            <Tooltip
              placement={'topRight'}
              overlayClassName={clsx('rectangle', 'max-w-[312px]')}
              title={t('page.swap.preferMEVTip')}
            >
              <PreferMEVGuardSwitch
                checked={originPreferMEVGuarded}
                onChange={switchPreferMEV}
              />
            </Tooltip>
          </div>
        )}
      </>
    ),
    [t, switchPreferMEV, showMEVGuardedSwitch, originPreferMEVGuarded, feeRate]
  );

  return (
    <div
      className={clsx('flex-1 overflow-auto page-has-ant-input', 'pb-[76px]')}
    >
      <div
        className={clsx(
          'bg-r-neutral-card-1 rounded-[6px] p-12 pt-0 pb-14 mx-20'
        )}
      >
        <div className={clsx(tipsClassName)}>{t('page.swap.chain')}</div>
        <ChainSelectorInForm
          value={chain}
          onChange={switchChain}
          disabledTips={getDisabledTips}
          supportChains={SWAP_SUPPORT_CHAINS}
          chainRenderClassName={clsx('text-[16px] font-medium rounded-[4px]')}
        />

        <div className={clsx(tipsClassName, 'flex items-center')}>
          <span className="block w-[150px]">{t('page.swap.swap-from')}</span>
          <span className="block w-[150px] ml-auto">{t('page.swap.to')}</span>
        </div>

        <div className="flex items-center justify-between">
          <TokenSelect
            token={payToken}
            onTokenChange={(token) => {
              const chainItem = findChainByServerID(token.chain);
              if (chainItem?.enum !== chain) {
                switchChain(chainItem?.enum || CHAINS_ENUM.ETH);
                setReceiveToken(undefined);
              }
              setPayToken(token);
            }}
            chainId={CHAINS[chain].serverId}
            type={'swapFrom'}
            placeholder={t('page.swap.search-by-name-address')}
            excludeTokens={receiveToken?.id ? [receiveToken?.id] : undefined}
            tokenRender={(p) => <TokenRender {...p} />}
          />
          <IconSwapArrow
            className="text-r-neutral-foot opacity-60 hover:opacity-100 cursor-pointer"
            onClick={exchangeToken}
          />
          <TokenSelect
            token={receiveToken}
            onTokenChange={(token) => {
              const chainItem = findChainByServerID(token.chain);
              if (chainItem?.enum !== chain) {
                switchChain(chainItem?.enum || CHAINS_ENUM.ETH);
                setPayToken(undefined);
              }
              setReceiveToken(token);
              if (token?.low_credit_score) {
                setLowCreditToken(token);
                setLowCreditVisible(true);
              }
            }}
            chainId={CHAINS[chain].serverId}
            type={'swapTo'}
            placeholder={t('page.swap.search-by-name-address')}
            excludeTokens={payToken?.id ? [payToken?.id] : undefined}
            tokenRender={(p) => <TokenRender {...p} />}
            useSwapTokenList
          />
        </div>

        <div
          className={clsx(tipsClassName, 'flex items-center justify-between')}
        >
          <div>
            {t('page.swap.amount-in', {
              symbol: payToken ? getTokenSymbol(payToken) : '',
            })}{' '}
          </div>
          <div
            className={clsx(
              'text-r-neutral-body flex items-center',
              !payToken && 'hidden'
            )}
          >
            {t('global.Balance')}: {formatAmount(payToken?.amount || 0)}
            {new BigNumber(payToken?.raw_amount_hex_str || 0, 16).gt(0) && (
              <MaxButton onClick={handleBalance}>
                {t('page.swap.max')}
              </MaxButton>
            )}
          </div>
        </div>
        <StyledInput
          spellCheck={false}
          placeholder="0"
          value={inputAmount}
          onChange={handleAmountChange}
          ref={inputRef as any}
          suffix={
            <span className="text-r-neutral-foot text-12">
              {inputAmount
                ? `≈ ${formatUsdValue(
                    new BigNumber(inputAmount)
                      .times(payToken?.price || 0)
                      .toString(10)
                  )}`
                : ''}
            </span>
          }
        />

        {quoteOrAmountLoading &&
          amountAvailable &&
          !inSufficient &&
          !activeProvider?.manualClick && <BestQuoteLoading />}

        {Number(debouncePayAmount) > 0 &&
          !inSufficient &&
          amountAvailable &&
          (!quoteOrAmountLoading ||
            (activeProvider && !!activeProvider.manualClick)) &&
          payToken &&
          receiveToken && (
            <>
              <ReceiveDetails
                bestQuoteDex={bestQuoteDex}
                activeProvider={activeProvider}
                isWrapToken={isWrapToken}
                className="section"
                payAmount={debouncePayAmount}
                receiveRawAmount={activeProvider?.actualReceiveAmount || 0}
                payToken={payToken}
                receiveToken={receiveToken}
                quoteWarning={activeProvider?.quoteWarning}
                chain={chain}
                openQuotesList={openQuotesList}
              />
            </>
          )}

        {Number(debouncePayAmount) > 0 &&
          (!quoteOrAmountLoading || !!activeProvider?.manualClick) &&
          !!activeProvider &&
          !!activeProvider?.quote?.toTokenAmount &&
          payToken &&
          receiveToken && (
            <div className="section text-13 leading-4 text-r-neutral-body mt-14 px-12">
              <div className="subText flex flex-col gap-14">
                {isWrapToken ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span>{t('page.swap.slippage-tolerance')}</span>
                      <span className="font-medium text-r-neutral-title-1">
                        {t('page.swap.no-slippage-for-wrap')}
                      </span>
                    </div>
                    {FeeAndMEVGuarded}
                  </>
                ) : (
                  <>
                    <Slippage
                      displaySlippage={slippage}
                      value={slippageState}
                      onChange={(e) => {
                        setSlippageChanged(true);
                        setSlippage(e);
                      }}
                      recommendValue={
                        slippageValidInfo?.is_valid
                          ? undefined
                          : slippageValidInfo?.suggest_slippage
                      }
                    />
                    {FeeAndMEVGuarded}
                  </>
                )}
              </div>
            </div>
          )}
      </div>
      {inSufficient ? (
        <Alert
          className={clsx(
            'mx-[20px] rounded-[4px] px-0 py-[3px] bg-transparent mt-6'
          )}
          icon={
            <InfoCircleFilled
              className={clsx(
                'pb-[4px] self-start transform rotate-180 origin-center',
                inSufficient ? 'text-red-forbidden' : 'text-orange'
              )}
            />
          }
          banner
          message={
            <span
              className={clsx(
                'text-13 leading-[16px]',
                inSufficient ? 'text-red-forbidden' : 'text-orange'
              )}
            >
              {t('page.swap.insufficient-balance')}
            </span>
          }
        />
      ) : null}
      <div
        className={clsx(
          'fixed w-full bottom-0 mt-auto flex flex-col items-center justify-center p-20 gap-10',
          'bg-r-neutral-bg-1 border border-t-[0.5px] border-transparent border-t-rabby-neutral-line',
          'py-[13px]'
        )}
      >
        <Button
          type="primary"
          block
          size="large"
          className="h-[48px] text-white text-[16px] font-medium"
          onClick={() => {
            if (!activeProvider || expired || slippageChanged) {
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
          disabled={
            !payToken ||
            !receiveToken ||
            !amountAvailable ||
            inSufficient ||
            payAmountLoading ||
            !activeProvider
          }
        >
          {btnText}
        </Button>
      </div>
      <ReserveGasPopup
        selectedItem={gasLevel}
        chain={chain}
        limit={gasLimit}
        onGasChange={changeGasPrice}
        gasList={gasList}
        visible={reserveGasOpen}
        onCancel={closeReserveGasOpen}
        onClose={closeReserveGasOpen}
        rawHexBalance={payToken?.raw_amount_hex_str}
      />
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
          payAmount={debouncePayAmount}
          receiveToken={receiveToken}
          fee={feeRate}
          inSufficient={inSufficient}
          setActiveProvider={setActiveProvider}
        />
      ) : null}
      <MiniApproval
        visible={isShowSign}
        txs={txs}
        ga={{
          category: 'Swap',
          source: 'swap',
          trigger: rbiSource,
        }}
        onClose={() => {
          setIsShowSign(false);
          setTimeout(() => {
            mutateTxs([]);
          }, 500);
        }}
        onReject={() => {
          setIsShowSign(false);
          mutateTxs([]);
        }}
        onResolve={() => {
          setTimeout(() => {
            setIsShowSign(false);
            mutateTxs([]);
            // setPayAmount('');
            // setTimeout(() => {
            history.replace('/');
            // }, 500);
          }, 500);
        }}
      />
      <LowCreditModal
        token={lowCreditToken}
        visible={lowCreditVisible}
        onCancel={() => {
          setLowCreditVisible(false);
          lowCreditInit.current = true;
        }}
      />
    </div>
  );
};
