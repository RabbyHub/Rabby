import React, { useCallback, useMemo, useState } from 'react';
import { useRabbySelector } from '@/ui/store';
import { useBridge } from '../hooks/token';
import { Alert, Button, Input, message, Modal } from 'antd';
import BigNumber from 'bignumber.js';
import { useWallet } from '@/ui/utils';
import styled from 'styled-components';
import clsx from 'clsx';
import { QuoteList } from './BridgeQuotes';
import { useQuoteVisible, useSetQuoteVisible, useSetRefreshId } from '../hooks';
import { useRbiSource } from '@/ui/utils/ga-event';
import { useCss } from 'react-use';
import { findChainByEnum, findChainByServerID } from '@/utils/chain';
import type { SelectChainItemProps } from '@/ui/component/ChainSelector/components/SelectChainItem';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';

import pRetry from 'p-retry';
import stats from '@/stats';
import { MiniApproval } from '../../Approval/components/MiniSignTx';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { useHistory } from 'react-router-dom';
import { BridgeToken } from './BridgeToken';
import { BridgeShowMore, RecommendFromToken } from './BridgeShowMore';
import { BridgeSwitchBtn } from './BridgeSwitchButton';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';

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

    bestQuoteId,
    selectedBridgeQuote,

    setSelectedBridgeQuote,

    slippage,
    slippageState,
    setSlippage,
    setSlippageChanged,
    isSlippageHigh,
    isSlippageLow,
  } = useBridge();

  const amountAvailable = useMemo(() => Number(amount) > 0, [amount]);

  const visible = useQuoteVisible();

  const setVisible = useSetQuoteVisible();

  const refresh = useSetRefreshId();

  const { t } = useTranslation();

  const btnText = useMemo(() => {
    if (selectedBridgeQuote?.shouldApproveToken) {
      return t('page.bridge.approve-and-bridge');
    }
    return t('page.bridge.title');
  }, [selectedBridgeQuote?.shouldApproveToken]);

  const wallet = useWallet();
  const rbiSource = useRbiSource();

  const [fetchingBridgeQuote, setFetchingBridgeQuote] = useState(false);

  const [isShowSign, setIsShowSign] = useState(false);
  const gotoBridge = useCallback(async () => {
    if (
      !inSufficient &&
      fromToken &&
      toToken &&
      selectedBridgeQuote?.bridge_id
    ) {
      try {
        setFetchingBridgeQuote(true);
        const { tx } = await pRetry(
          () =>
            wallet.openapi.getBridgeQuoteTxV2({
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
        wallet.bridgeToken(
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
  ]);

  const buildTxs = useMemoizedFn(async () => {
    if (
      !inSufficient &&
      fromToken &&
      toToken &&
      selectedBridgeQuote?.bridge_id
    ) {
      try {
        setFetchingBridgeQuote(true);
        const { tx } = await pRetry(
          () =>
            wallet.openapi.getBridgeQuoteTxV2({
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

  const noQuote =
    !inSufficient &&
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

  return (
    <div
      className={clsx(
        'flex-1 overflow-auto page-has-ant-input',
        selectedBridgeQuote?.shouldApproveToken ? 'pb-[130px]' : 'pb-[110px]'
      )}
    >
      <div className="relative flex flex-col mx-20 gap-8">
        <BridgeToken
          type="from"
          chain={fromChain}
          token={fromToken}
          onChangeToken={setFromToken}
          onChangeChain={switchFromChain}
          value={amount}
          onInputChange={handleAmountChange}
          excludeChains={toChain ? [toChain] : undefined}
        />
        <BridgeToken
          type="to"
          chain={toChain}
          token={toToken}
          onChangeToken={setToToken}
          onChangeChain={setToChain}
          fromChainId={fromToken?.chain || findChainByEnum(fromChain)?.serverId}
          fromTokenId={fromToken?.id}
          valueLoading={quoteLoading}
          value={selectedBridgeQuote?.to_token_amount}
          excludeChains={fromChain ? [fromChain] : undefined}
          noQuote={noQuote}
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <BridgeSwitchBtn onClick={switchToken} />
        </div>
      </div>

      <div className="mx-20">
        {selectedBridgeQuote && (
          <BridgeShowMore
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

      {inSufficient || (noQuote && !recommendFromToken) ? (
        <Alert
          className={clsx(
            'mx-[20px] rounded-[4px] px-0 py-[3px] bg-transparent mt-6'
          )}
          icon={
            <RcIconWarningCC
              viewBox="0 0 16 16"
              className={clsx(
                'relative top-[3px] mr-2 self-start origin-center w-16 h-15',
                'text-red-forbidden'
              )}
            />
          }
          banner
          message={
            <span
              className={clsx('text-13 font-medium', 'text-rabby-red-default')}
            >
              {inSufficient
                ? t('page.bridge.insufficient-balance')
                : t('page.bridge.no-quote-found')}
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
          disabled={btnDisabled}
        >
          {btnText}
        </Button>
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
        />
      ) : null}
      <MiniApproval
        visible={isShowSign}
        ga={{
          category: 'Bridge',
          source: 'bridge',
          trigger: rbiSource,
        }}
        txs={txs}
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
    </div>
  );
};
