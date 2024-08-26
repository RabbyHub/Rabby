import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRabbySelector } from '@/ui/store';
import { useTokenPair } from '../hooks/token';
import { Alert, Button, Input, message, Modal } from 'antd';
import BigNumber from 'bignumber.js';
import {
  formatAmount,
  formatTokenAmount,
  formatUsdValue,
  useWallet,
} from '@/ui/utils';
import styled from 'styled-components';
import clsx from 'clsx';
import { QuoteList } from './BridgeQuotes';
import { useQuoteVisible, useSetQuoteVisible, useSetRefreshId } from '../hooks';
import { InfoCircleFilled } from '@ant-design/icons';
import { BridgeReceiveDetails } from './BridgeReceiveDetail';
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

import pRetry from 'p-retry';
import stats from '@/stats';
import { BestQuoteLoading } from '../../Swap/Component/loading';
import { MaxButton } from '../../SendToken/components/MaxButton';
import { MiniApproval } from '../../Approval/components/MiniSignTx';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { useHistory } from 'react-router-dom';

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

const getDisabledTips: SelectChainItemProps['disabledTips'] = (ctx) => {
  const chainItem = findChainByServerID(ctx.chain.serverId);

  if (chainItem?.isTestnet) return i18n.t('page.swap.testnet-is-not-supported');

  return i18n.t('page.swap.not-supported');
};

export const BridgeContent = () => {
  const { userAddress } = useRabbySelector((state) => ({
    userAddress: state.account.currentAccount?.address || '',
  }));

  const {
    chain,
    switchChain,

    payToken,
    setPayToken,
    receiveToken,
    setReceiveToken,

    handleAmountChange,
    setPayAmount,
    handleBalance,

    debouncePayAmount,
    inputAmount,

    inSufficient,

    openQuotesList,
    quoteLoading,
    quoteList,

    bestQuoteId,
    selectedBridgeQuote,

    setSelectedBridgeQuote,
    expired,
  } = useTokenPair(userAddress);

  const payAmountLoading = useMemo(() => inputAmount !== debouncePayAmount, [
    inputAmount,
    debouncePayAmount,
  ]);

  const quoteOrAmountLoading = quoteLoading || payAmountLoading;

  const amountAvailable = useMemo(() => Number(debouncePayAmount) > 0, [
    debouncePayAmount,
  ]);

  const aggregatorIds = useRabbySelector(
    (s) => s.bridge.aggregatorsList.map((e) => e.id) || []
  );

  const inputRef = useRef<Input>();

  useLayoutEffect(() => {
    if ((payToken?.id, receiveToken?.id)) {
      inputRef.current?.focus();
    }
  }, [payToken?.id, receiveToken?.id]);

  const visible = useQuoteVisible();

  const setVisible = useSetQuoteVisible();

  const refresh = useSetRefreshId();

  const { t } = useTranslation();

  const btnText = useMemo(() => {
    if (selectedBridgeQuote && expired) {
      return t('page.bridge.price-expired-refresh-route');
    }
    if (selectedBridgeQuote?.shouldApproveToken) {
      return t('page.bridge.approve-and-bridge', {
        name: selectedBridgeQuote?.aggregator.name || '',
      });
    }
    if (selectedBridgeQuote?.aggregator.name) {
      return t('page.bridge.bridge-via-x', {
        name: selectedBridgeQuote?.aggregator.name,
      });
    }

    return t('page.bridge.title');
  }, [selectedBridgeQuote, expired, t]);

  const wallet = useWallet();
  const rbiSource = useRbiSource();

  const supportedChains = useRabbySelector((s) => s.bridge.supportedChains);
  const [fetchingBridgeQuote, setFetchingBridgeQuote] = useState(false);

  const [isShowSign, setIsShowSign] = useState(false);
  const gotoBridge = useCallback(async () => {
    if (
      !inSufficient &&
      payToken &&
      receiveToken &&
      selectedBridgeQuote?.bridge_id
    ) {
      try {
        setFetchingBridgeQuote(true);
        const { tx } = await pRetry(
          () =>
            wallet.openapi.getBridgeQuote({
              aggregator_id: selectedBridgeQuote.aggregator.id,
              bridge_id: selectedBridgeQuote.bridge_id,
              from_token_id: payToken.id,
              user_addr: userAddress,
              from_chain_id: payToken.chain,
              from_token_raw_amount: new BigNumber(debouncePayAmount)
                .times(10 ** payToken.decimals)
                .toFixed(0, 1)
                .toString(),
              to_chain_id: receiveToken.chain,
              to_token_id: receiveToken.id,
            }),
          { retries: 1 }
        );
        stats.report('bridgeQuoteResult', {
          aggregatorIds: selectedBridgeQuote.aggregator.id,
          bridgeId: selectedBridgeQuote.bridge_id,
          fromChainId: payToken.chain,
          fromTokenId: payToken.id,
          toTokenId: receiveToken.id,
          toChainId: receiveToken.chain,
          status: tx ? 'success' : 'fail',
        });
        wallet.bridgeToken(
          {
            to: tx.to,
            value: tx.value,
            data: tx.data,
            payTokenRawAmount: new BigNumber(debouncePayAmount)
              .times(10 ** payToken.decimals)
              .toFixed(0, 1)
              .toString(),
            chainId: tx.chainId,
            shouldApprove: !!selectedBridgeQuote.shouldApproveToken,
            shouldTwoStepApprove: !!selectedBridgeQuote.shouldTwoStepApprove,
            payTokenId: payToken.id,
            payTokenChainServerId: payToken.chain,
            info: {
              aggregator_id: selectedBridgeQuote.aggregator.id,
              bridge_id: selectedBridgeQuote.bridge_id,
              from_chain_id: payToken.chain,
              from_token_id: payToken.id,
              from_token_amount: debouncePayAmount,
              to_chain_id: receiveToken.chain,
              to_token_id: receiveToken.id,
              to_token_amount: selectedBridgeQuote.to_token_amount,
              tx: tx,
              rabby_fee: selectedBridgeQuote.rabby_fee.usd_value,
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
        window.close();
      } catch (error) {
        message.error(error?.message || String(error));
        stats.report('bridgeQuoteResult', {
          aggregatorIds: selectedBridgeQuote.aggregator.id,
          bridgeId: selectedBridgeQuote.bridge_id,
          fromChainId: payToken.chain,
          fromTokenId: payToken.id,
          toTokenId: receiveToken.id,
          toChainId: receiveToken.chain,
          status: 'fail',
        });
        console.error(error);
      } finally {
        setFetchingBridgeQuote(false);
      }
    }
  }, [
    inSufficient,
    payToken,
    receiveToken,
    selectedBridgeQuote?.tx,
    selectedBridgeQuote?.shouldApproveToken,
    selectedBridgeQuote?.shouldTwoStepApprove,
    selectedBridgeQuote?.aggregator.id,
    selectedBridgeQuote?.bridge_id,
    selectedBridgeQuote?.to_token_amount,
    wallet,
    debouncePayAmount,
    rbiSource,
  ]);

  const buildTxs = useMemoizedFn(async () => {
    if (
      !inSufficient &&
      payToken &&
      receiveToken &&
      selectedBridgeQuote?.bridge_id
    ) {
      try {
        setFetchingBridgeQuote(true);
        const { tx } = await pRetry(
          () =>
            wallet.openapi.getBridgeQuote({
              aggregator_id: selectedBridgeQuote.aggregator.id,
              bridge_id: selectedBridgeQuote.bridge_id,
              from_token_id: payToken.id,
              user_addr: userAddress,
              from_chain_id: payToken.chain,
              from_token_raw_amount: new BigNumber(debouncePayAmount)
                .times(10 ** payToken.decimals)
                .toFixed(0, 1)
                .toString(),
              to_chain_id: receiveToken.chain,
              to_token_id: receiveToken.id,
            }),
          { retries: 1 }
        );
        stats.report('bridgeQuoteResult', {
          aggregatorIds: selectedBridgeQuote.aggregator.id,
          bridgeId: selectedBridgeQuote.bridge_id,
          fromChainId: payToken.chain,
          fromTokenId: payToken.id,
          toTokenId: receiveToken.id,
          toChainId: receiveToken.chain,
          status: tx ? 'success' : 'fail',
        });
        return wallet.buildBridgeToken(
          {
            to: tx.to,
            value: tx.value,
            data: tx.data,
            payTokenRawAmount: new BigNumber(debouncePayAmount)
              .times(10 ** payToken.decimals)
              .toFixed(0, 1)
              .toString(),
            chainId: tx.chainId,
            shouldApprove: !!selectedBridgeQuote.shouldApproveToken,
            shouldTwoStepApprove: !!selectedBridgeQuote.shouldTwoStepApprove,
            payTokenId: payToken.id,
            payTokenChainServerId: payToken.chain,
            info: {
              aggregator_id: selectedBridgeQuote.aggregator.id,
              bridge_id: selectedBridgeQuote.bridge_id,
              from_chain_id: payToken.chain,
              from_token_id: payToken.id,
              from_token_amount: debouncePayAmount,
              to_chain_id: receiveToken.chain,
              to_token_id: receiveToken.id,
              to_token_amount: selectedBridgeQuote.to_token_amount,
              tx: tx,
              rabby_fee: selectedBridgeQuote.rabby_fee.usd_value,
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
        message.error(error?.message || String(error));
        stats.report('bridgeQuoteResult', {
          aggregatorIds: selectedBridgeQuote.aggregator.id,
          bridgeId: selectedBridgeQuote.bridge_id,
          fromChainId: payToken.chain,
          fromTokenId: payToken.id,
          toTokenId: receiveToken.id,
          toChainId: receiveToken.chain,
          status: 'fail',
        });
        console.error(error);
      } finally {
        setFetchingBridgeQuote(false);
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

  const handleBridge = useMemoizedFn(async () => {
    if (
      [
        KEYRING_TYPE.SimpleKeyring,
        KEYRING_TYPE.HdKeyring,
        KEYRING_CLASS.HARDWARE.LEDGER,
      ].includes((currentAccount?.type || '') as any)
    ) {
      await runBuildSwapTxs();
      setIsShowSign(true);
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

  return (
    <div
      className={clsx(
        'flex-1 overflow-auto page-has-ant-input',
        selectedBridgeQuote?.shouldApproveToken ? 'pb-[130px]' : 'pb-[110px]'
      )}
    >
      <div
        className={clsx('bg-r-neutral-card-1 rounded-[6px] p-12 pt-0 mx-20')}
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
            aggregatorIds={aggregatorIds || []}
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
              'text-r-neutral-body flex items-center',
              !payToken && 'hidden'
            )}
          >
            {t('global.Balance')}: {formatAmount(payToken?.amount || 0)}
            <MaxButton
              onClick={() => {
                handleBalance();
              }}
            >
              {t('page.swap.max')}
            </MaxButton>
          </div>
        </div>
        <StyledInput
          spellCheck={false}
          placeholder="0"
          value={inputAmount}
          onChange={handleAmountChange}
          ref={inputRef as any}
          className="bg-transparent"
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
          !selectedBridgeQuote?.manualClick && <BestQuoteLoading />}

        {payToken &&
          !inSufficient &&
          receiveToken &&
          amountAvailable &&
          (!quoteOrAmountLoading || selectedBridgeQuote?.manualClick) && (
            <BridgeReceiveDetails
              openQuotesList={openQuotesList}
              activeProvider={selectedBridgeQuote}
              className="section"
              payAmount={debouncePayAmount}
              payToken={payToken}
              receiveToken={receiveToken}
              bestQuoteId={bestQuoteId}
            />
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
          loading={fetchingBridgeQuote}
          type="primary"
          block
          size="large"
          className="h-[48px] text-white text-[16px] font-medium"
          onClick={() => {
            if (fetchingBridgeQuote) return;
            if (!selectedBridgeQuote || expired) {
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
                      Token USDT requires 2 transactions to change allowance.
                      First you would need to reset allowance to zero, and only
                      then set new allowance value.
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
            !payToken ||
            !receiveToken ||
            !amountAvailable ||
            inSufficient ||
            payAmountLoading ||
            !selectedBridgeQuote
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
          payAmount={debouncePayAmount}
          receiveToken={receiveToken}
          inSufficient={inSufficient}
          setSelectedBridgeQuote={setSelectedBridgeQuote}
        />
      ) : null}
      <MiniApproval
        visible={isShowSign}
        txs={txs}
        onClose={() => {
          setIsShowSign(false);
          mutateTxs([]);
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
    </div>
  );
};
