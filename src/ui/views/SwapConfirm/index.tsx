import React, { useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { useLocation } from 'react-router-dom';
import { numberToHex } from 'web3-utils';
import { Button, Tooltip } from 'antd';
import axios from 'axios';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { splitNumberByStep, formatTokenAmount, useWallet } from 'ui/utils';
import { TokenItem } from 'background/service/openapi';
import { PageHeader } from 'ui/component';
import TokenWithChain from 'ui/component/TokenWithChain';
import IconQuoteRefresh from 'ui/assets/refresh-quote.svg';
import IconRevert from 'ui/assets/revert-quote.svg';
import IconArrowDown from 'ui/assets/big-arrow-down-gray.svg';
import IconBestQuote from 'ui/assets/best-quote.svg';
import { Question } from 'ui/assets';
import './style.less';

const SwapConfirm = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const { state } = useLocation<{
    data: {
      dapp: {
        logo: string;
        name: string;
        id: string;
      };
      data: {
        allowance: string;
        approve_addr: string;
        contract_id: string;
        gas_used: number;
        is_gas_accurate: boolean;
        loss_ratio: number;
        other_eth_fee_amount: number;
        other_fee_amount: number;
        receive_token_amount: string;
        tx: null;
      };
    };
    from: TokenItem;
    to: TokenItem;
    fromValue: string;
    chainId: CHAINS_ENUM;
    priceSlippage: number;
  }>();
  const [data, setData] = useState(state.data.data);
  const [from, setFrom] = useState(state.from);
  const [to, setTo] = useState(state.to);
  const [isReverted, setIsReverted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const needApprove =
    new BigNumber(data.allowance)
      .dividedBy(10 ** state.to.decimals)
      .lt(new BigNumber(state.fromValue)) ||
    from.id === '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82';

  const handleRevertExchangeRate = () => {
    setIsReverted(!isReverted);
  };

  const loadQuote = async () => {
    const account = await wallet.syncGetCurrentAccount();
    const { data } = await axios.get('https://api.debank.com/swap/check', {
      params: {
        dex_id: 'bsc_pancakeswap',
        pay_token_id: from.id,
        pay_token_amount: new BigNumber(state.fromValue).times(1e18).toFixed(),
        receive_token_id: state.to.id,
        user_addr: account?.address,
        max_slippage: state.priceSlippage / 100,
        chain: CHAINS[state.chainId].serverId,
      },
    });
    return data.data;
  };

  const loadToken = async (
    token: TokenItem,
    address: string
  ): Promise<TokenItem> => {
    return await wallet.openapi.getToken(address, token.chain, token.id);
  };

  const handleRefreshQuote = async () => {
    setIsRefreshing(true);
    const account = await wallet.syncGetCurrentAccount();
    const quote = await loadQuote();
    const [fromToken, toToken] = await Promise.all([
      loadToken(from, account.address),
      loadToken(to, account.address),
    ]);
    setFrom(fromToken);
    setTo(toToken);
    setData(quote);
    setIsRefreshing(false);
  };

  const handleSubmit = async () => {
    const account = await wallet.syncGetCurrentAccount();
    const chain = CHAINS[state.chainId];
    const swapTx = await axios.get('https://api.debank.com/swap/prepare', {
      params: {
        dex_id: state.data.dapp.id,
        pay_token_id: from.id,
        pay_token_amount: new BigNumber(state.fromValue)
          .times(Math.pow(10, from.decimals))
          .toFixed(),
        receive_token_id: to.id,
        user_addr: account.address,
        max_slippage: state.priceSlippage,
        chain: chain.serverId,
        gasPrice: '7000000000',
      },
    });
    if (from.id !== chain.nativeTokenAddress && needApprove) {
      wallet.approveAndSwap(
        {
          owner: account.address,
          spender: data.contract_id,
          erc20: from.id,
          value: numberToHex(
            Number(state.fromValue) * Math.pow(10, from.decimals)
          ),
          chainId: chain.id,
        },
        swapTx.data.data.tx
      );
    } else {
      wallet.sendRequest({
        method: 'eth_sendTransaction',
        params: [swapTx.data.data.tx],
      });
    }
  };

  return (
    <div className="swapConfirm">
      <PageHeader>{t('Swap')}</PageHeader>
      <div className="swapConfirm-main">
        <div className="swapConfirm-main__from">
          <TokenWithChain width="20px" height="20px" token={state.from} />
          {state.fromValue}
          {from.symbol}
        </div>
        <div className="swapConfirm-main__arrow">
          <img src={IconArrowDown} className="icon icon-arrow-down" />
        </div>
        <div className="relative">
          <div className="swapConfirm-main__tip">
            <img className="best-quote" src={IconBestQuote} />
            <Tooltip
              title={t(
                'A Rabby fee of 0.875% has been deducted from the quote'
              )}
              overlayClassName="rectangle best-quote__tooltip"
              autoAdjustOverflow={false}
            >
              <Question className="icon icon-question" />
            </Tooltip>
          </div>
          <div className="swapConfirm-main__to">
            <div className="swapConfirm-main__to-refresh">
              <img
                src={IconQuoteRefresh}
                className={clsx('icon icon-refresh', { spining: isRefreshing })}
                onClick={handleRefreshQuote}
              />
            </div>
            <div className="swapConfirm-main__to-info">
              <div className="swapConfirm-main__to-info__token">
                <TokenWithChain width="24px" height="24px" token={state.to} />
                {to.symbol}
              </div>
              <div className="swapConfirm-main__to-info__amount">
                {new BigNumber(data.receive_token_amount)
                  .dividedBy(10 ** to.decimals)
                  .toFixed(Number(data.receive_token_amount) > 1 ? 6 : 10)}
              </div>
              <div className="swapConfirm-main__to-info__usd">
                ≈ $
                {splitNumberByStep(
                  new BigNumber(data.receive_token_amount)
                    .dividedBy(10 ** to.decimals)
                    .times(to.price)
                    .toFixed(2)
                )}
              </div>
              <div className="swapConfirm-main__to-info__exchangeRate">
                1 {isReverted ? to.symbol : from.symbol} ={' '}
                {formatTokenAmount(
                  isReverted
                    ? new BigNumber(to.price).div(from.price).toFixed()
                    : new BigNumber(from.price).div(to.price).toFixed(),
                  10
                )}
                {isReverted ? from.symbol : state.to.symbol}
                <img
                  src={IconRevert}
                  className="icon icon-revert"
                  onClick={handleRevertExchangeRate}
                />
              </div>
            </div>
          </div>
          <div className="swapConfirm-main__stack w-[328px] h-[257px] bottom-[-8px] opacity-80" />
          <div className="swapConfirm-main__stack w-[304px] h-[257px] bottom-[-16px] opacity-40" />
        </div>
      </div>
      <div className="mt-[72px] flex justify-center">
        <Button
          type="primary"
          onClick={handleSubmit}
          size="large"
          className="w-[200px]"
        >
          {needApprove ? t('Approve and Swap') : t('Swap')}
        </Button>
      </div>
    </div>
  );
};

export default SwapConfirm;
