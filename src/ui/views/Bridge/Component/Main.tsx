import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useRabbySelector } from '@/ui/store';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { useTokenPair } from '../hooks/token';
import { Alert, Button, Input, Modal, Switch, Tooltip } from 'antd';
import BigNumber from 'bignumber.js';
import {
  formatAmount,
  formatTokenAmount,
  formatUsdValue,
  useWallet,
} from '@/ui/utils';
import styled from 'styled-components';
import clsx from 'clsx';
import { QuoteList } from './Quotes';
import { useQuoteVisible, useSetQuoteVisible } from '../hooks';
import { InfoCircleFilled } from '@ant-design/icons';
import { ReceiveDetails } from './ReceiveDetail';
import { useDispatch } from 'react-redux';
import { useRbiSource } from '@/ui/utils/ga-event';
import { useCss } from 'react-use';
import { getTokenSymbol } from '@/ui/utils/token';
import ChainSelectorInForm from '@/ui/component/ChainSelector/InForm';
import { findChainByServerID } from '@/utils/chain';
import type { SelectChainItemProps } from '@/ui/component/ChainSelector/components/SelectChainItem';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { BridgeTokenPair } from './BridgeTokenPair';
import { ReactComponent as RcArrowDown } from '@/ui/assets/bridge/down.svg';

import { ReactComponent as RcIconQuestion } from '@/ui/assets/bridge/question-cc.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

const tipsClassName = clsx('text-r-neutral-body text-12 mb-8 pt-16');

const StyledInput = styled(Input)`
  height: 46px;
  font-weight: 500;
  font-size: 18px;
  box-shadow: none;
  border-radius: 4px;
  border: 0.5px solid var(--r-neutral-line, #d3d8e0);
  background: transparent !important;
  & > .ant-input {
    font-weight: 500;
    font-size: 18px;
    border-width: 0px !important;
    border-color: transparent;
  }
  &.ant-input-affix-wrapper:not(.ant-input-affix-wrapper-disabled):hover {
    border-width: 0.5px !important;
  }
  &:active {
    border: 0.5px solid transparent;
  }
  &:focus,
  &:focus-within {
    border-width: 0.5px !important;
    border-color: var(--r-blue-default, #7084ff) !important;
  }
  &:hover {
    border-width: 0.5px !important;
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
  min-width: 24px;
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

  const setUnlimited = useCallback(
    (bool: boolean) => {
      dispatch.swap.setUnlimitedAllowance(bool);
    },
    [dispatch.swap.setUnlimitedAllowance]
  );

  const {
    chain,
    switchChain,

    payToken,
    setPayToken,
    receiveToken,
    setReceiveToken,
    exchangeToken,

    handleAmountChange,
    handleBalance,
    payAmount,
    payTokenIsNativeToken,
    isWrapToken,
    inSufficient,
    slippageChanged,
    setSlippageChanged,
    slippageState,
    slippage,
    setSlippage,

    feeRate,

    quoteLoading,
    quoteList,

    currentProvider: activeProvider,
    setActiveProvider,
    // slippageValidInfo,
    expired,
  } = useTokenPair(userAddress);

  const selectedAggregators = useRabbySelector(
    (s) => s.bridge.selectedAggregators
  );

  const allAggregators = useRabbySelector((s) => s.bridge.aggregatorsList);

  console.log('allAggregators', allAggregators);

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

  const visible = useQuoteVisible();
  const setVisible = useSetQuoteVisible();
  const { t } = useTranslation();

  const btnText = useMemo(() => {
    if (slippageChanged) {
      return t('page.bridge.slippage-adjusted-refresh-quote');
    }
    if (activeProvider && expired) {
      return t('page.bridge.price-expired-refresh-route');
    }
    if (activeProvider?.shouldApproveToken) {
      return t('page.bridge.approve-and-bridge');
    }
    if (activeProvider?.aggregator.name) {
      return t('page.bridge.bridge-via-x', {
        name: activeProvider?.aggregator.name,
      });
    }

    return t('page.bridge.getRoutes');
  }, [slippageChanged, activeProvider, expired, payToken, isWrapToken]);

  const wallet = useWallet();
  const rbiSource = useRbiSource();

  const supportedChains = useRabbySelector((s) => s.bridge.supportedChains);

  const gotoSwap = useCallback(async () => {
    if (!inSufficient && payToken && receiveToken && activeProvider?.tx) {
      try {
        wallet.bridgeToken(
          {
            to: activeProvider.tx.to,
            value: activeProvider.tx.value,
            data: activeProvider.tx.data,
            payTokenRawAmount: new BigNumber(payAmount)
              .times(10 ** payToken.decimals)
              .toFixed(0, 1)
              .toString(),
            chainId: activeProvider.tx.chainId,
            shouldApprove: !!activeProvider.shouldApproveToken,
            shouldTwoStepApprove: !!activeProvider.shouldTwoStepApprove,
            payTokenId: payToken.id,
            payTokenChainServerId: payToken.chain,
            info: {
              aggregator_id: activeProvider.aggregator.id,
              bridge_id: activeProvider.bridge_id,
              from_chain_id: payToken.chain,
              from_token_id: payToken.id,
              from_token_amount: payAmount,
              to_chain_id: receiveToken.chain,
              to_token_id: receiveToken.id,
              to_token_amount: activeProvider.to_token_amount,
              tx: activeProvider.tx,
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
        console.error(error);
      }
    }
  }, [
    preferMEVGuarded,
    inSufficient,
    payToken,
    unlimitedAllowance,
    wallet?.dexSwap,
    activeProvider?.shouldApproveToken,
    activeProvider?.shouldTwoStepApprove,
    activeProvider?.bridge_id,
    activeProvider?.aggregator?.id,
  ]);

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

  return (
    <div
      className={clsx(
        'flex-1 overflow-auto page-has-ant-input',
        isWrapToken
          ? ''
          : activeProvider?.shouldApproveToken
          ? 'pb-[130px]'
          : 'pb-[110px]'
      )}
    >
      <div
        className={clsx(
          'bg-r-neutral-card-1 rounded-[6px] p-12 pt-0 pb-10 mx-20'
        )}
      >
        <div className={clsx(tipsClassName)}>{t('page.bridge.bridgeTo')}</div>
        <ChainSelectorInForm
          value={chain}
          onChange={switchChain}
          disabledTips={getDisabledTips}
          supportChains={supportedChains}
          chainRenderClassName={clsx('h-[52px] text-[16px] font-medium')}
          arrowDownComponent={<RcArrowDown className="down" />}
        />

        <div className={clsx(tipsClassName)}>
          {t('page.bridge.BridgeTokenPair')}
        </div>

        <div className="flex items-center justify-between">
          <BridgeTokenPair
            onChange={(value) => {
              setPayToken(value.from);
              setReceiveToken(value.to);
            }}
            value={useMemo(
              () =>
                payToken && receiveToken
                  ? {
                      from: payToken,
                      to: receiveToken,
                    }
                  : undefined,
              [payToken, receiveToken]
            )}
            aggregatorIds={selectedAggregators || []}
            chain={chain}
          />
        </div>

        <div
          className={clsx(tipsClassName, 'flex items-center justify-between')}
        >
          <div>
            {t('page.bridge.Amount', {
              symbol: payToken ? getTokenSymbol(payToken) : '',
            })}
          </div>
          <div
            className={clsx(
              'text-r-neutral-title-1',
              'underline cursor-pointer'
            )}
            onClick={() => {
              handleBalance();
            }}
          >
            {t('global.Balance')}: {formatAmount(payToken?.amount || 0)}
          </div>
        </div>
        <StyledInput
          spellCheck={false}
          placeholder="0"
          value={payAmount}
          onChange={handleAmountChange}
          ref={inputRef as any}
          className="bg-transparent"
          suffix={
            <span className="text-r-neutral-foot text-12">
              {payAmount
                ? `≈ ${formatUsdValue(
                    new BigNumber(payAmount)
                      .times(payToken?.price || 0)
                      .toString(10)
                  )}`
                : ''}
            </span>
          }
        />

        {payAmount &&
          activeProvider &&
          activeProvider?.to_token_amount &&
          payToken &&
          receiveToken && (
            <>
              <ReceiveDetails
                activeProvider={activeProvider}
                className="section"
                payAmount={payAmount}
                payToken={payToken}
                receiveToken={receiveToken}
              />

              <div className="section text-13 leading-4 text-r-neutral-body mt-12 px-12 relative">
                <div className="subText flex flex-col gap-12">
                  <div className="flex justify-between">
                    <div className="inline-flex gap-4 items-center">
                      <span>{t('page.bridge.bridge-cost')}</span>

                      <TooltipWithMagnetArrow
                        arrowPointAtCenter
                        overlayClassName="rectangle w-[max-content] "
                        title={
                          <div>
                            <p>
                              Protocol Fee:{' '}
                              {formatTokenAmount(
                                new BigNumber(
                                  activeProvider.protocol_fee.usd_value
                                )
                                  .div(receiveToken.price)
                                  .toString()
                              )}{' '}
                              {getTokenSymbol(receiveToken)} ≈{' '}
                              {formatTokenAmount(
                                new BigNumber(
                                  activeProvider.protocol_fee.usd_value
                                )
                                  .div(payToken.price)
                                  .toString()
                              )}{' '}
                              {getTokenSymbol(payToken)}
                            </p>

                            <p>
                              Gas Fee:{' '}
                              {formatTokenAmount(
                                new BigNumber(activeProvider.gas_fee.usd_value)
                                  .div(receiveToken.price)
                                  .toString()
                              )}{' '}
                              {getTokenSymbol(receiveToken)} ≈
                              {formatTokenAmount(
                                new BigNumber(activeProvider.gas_fee.usd_value)
                                  .div(payToken.price)
                                  .toString()
                              )}{' '}
                              {getTokenSymbol(payToken)}
                            </p>

                            <p>
                              Rabby Fee:{' '}
                              {formatTokenAmount(
                                new BigNumber(
                                  activeProvider.rabby_fee.usd_value
                                )
                                  .div(receiveToken.price)
                                  .toString()
                              )}{' '}
                              {getTokenSymbol(receiveToken)} ≈
                              {formatTokenAmount(
                                new BigNumber(
                                  activeProvider.rabby_fee.usd_value
                                )
                                  .div(payToken.price)
                                  .toString()
                              )}{' '}
                              {getTokenSymbol(payToken)}
                            </p>
                          </div>
                        }
                      >
                        <RcIconQuestion
                          viewBox="0 0 14 14"
                          className="w-14 h-14"
                        />
                      </TooltipWithMagnetArrow>
                    </div>
                    <span className="font-medium text-r-neutral-title-1">
                      {formatTokenAmount(
                        new BigNumber(activeProvider.gas_fee.usd_value)
                          .plus(activeProvider.rabby_fee.usd_value)
                          .plus(activeProvider.protocol_fee.usd_value)
                          .div(payToken.price)
                          .toString()
                      )}{' '}
                      {receiveToken ? getTokenSymbol(receiveToken) : ''}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>{t('page.bridge.rabby-fee')}</span>
                    <span className="font-medium text-r-neutral-title-1">
                      0.25%
                    </span>
                  </div>
                </div>
              </div>
            </>
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
              {t('page.bridge.insufficient-balance')}
            </span>
          }
        />
      ) : null}

      <div
        className={clsx(
          'fixed w-full bottom-0 mt-auto flex flex-col items-center justify-center p-20 gap-12',
          'bg-r-neutral-bg-1 border border-t-[0.5px] border-transparent border-t-rabby-neutral-line',
          'py-[16px]'
        )}
      >
        <Button
          type="primary"
          block
          size="large"
          className="h-[48px] text-white text-[16px] font-medium"
          onClick={() => {
            if (!activeProvider || expired || slippageChanged) {
              setVisible(true);
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
                      Sign 2 transactions to change allowance
                    </div>
                    <div className="text-13 leading-[17px]  text-r-neutral-body">
                      Token USDT requires 2 transactions to change allowance.
                      First you would need to reset allowance to zero, and only
                      then set new allowance value.
                    </div>
                  </>
                ),
                okText: 'Proceed with two step approve',
                onOk() {
                  gotoSwap();
                },
              });
            }
            gotoSwap();
          }}
          disabled={
            !payToken || !receiveToken || !payAmount || Number(payAmount) === 0
          }
        >
          {btnText}
        </Button>
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
          payToken={payToken}
          payAmount={payAmount}
          receiveToken={receiveToken}
          inSufficient={inSufficient}
          setActiveProvider={setActiveProvider}
        />
      ) : null}
    </div>
  );
};
