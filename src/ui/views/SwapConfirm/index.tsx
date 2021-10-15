import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { useLocation } from 'react-router-dom';
import { Button } from 'antd';
import { splitNumberByStep, formatTokenAmount } from 'ui/utils';
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
  }>();
  const [isReverted, setIsReverted] = useState(false);
  const needApprove = new BigNumber(state.data.data.allowance)
    .dividedBy(10 ** state.to.decimals)
    .lt(new BigNumber(state.fromValue));

  const handleRevertExchangeRate = () => {
    setIsReverted(!isReverted);
  };

  const handleSubmit = () => {
    // TODO
  };

  return (
    <div className="swapConfirm">
      <PageHeader>{t('Swap')}</PageHeader>
      <div className="swapConfirm-main">
        <div className="swapConfirm-main__from">
          <TokenWithChain width="20px" height="20px" token={state.from} />
          {state.fromValue}
          {state.from.symbol}
        </div>
        <div className="swapConfirm-main__arrow">
          <img src={IconArrowDown} className="icon icon-arrow-down" />
        </div>
        <div className="relative">
          <div className="swapConfirm-main__tip">
            <img className="best-quote" src={IconBestQuote} />
            <Question className="icon icon-question" />
          </div>
          <div className="swapConfirm-main__to">
            <div className="swapConfirm-main__to-refresh">
              <img src={IconQuoteRefresh} className="icon icon-refresh" />
            </div>
            <div className="swapConfirm-main__to-info">
              <div className="swapConfirm-main__to-info__token">
                <TokenWithChain width="24px" height="24px" token={state.to} />
                {state.to.symbol}
              </div>
              <div className="swapConfirm-main__to-info__amount">
                {new BigNumber(state.data.data.receive_token_amount)
                  .dividedBy(10 ** state.to.decimals)
                  .toFixed(
                    Number(state.data.data.receive_token_amount) > 1 ? 6 : 10
                  )}
              </div>
              <div className="swapConfirm-main__to-info__usd">
                ≈ $
                {splitNumberByStep(
                  new BigNumber(state.data.data.receive_token_amount)
                    .dividedBy(10 ** state.to.decimals)
                    .times(state.to.price)
                    .toFixed(2)
                )}
              </div>
              <div className="swapConfirm-main__to-info__exchangeRate">
                1 {isReverted ? state.to.symbol : state.from.symbol} ={' '}
                {formatTokenAmount(
                  isReverted
                    ? new BigNumber(state.to.price)
                        .div(state.from.price)
                        .toFixed()
                    : new BigNumber(state.from.price)
                        .div(state.to.price)
                        .toFixed(),
                  10
                )}
                {isReverted ? state.from.symbol : state.to.symbol}
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
