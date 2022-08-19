import { TokenItem } from '@/background/service/openapi';
import { getTokenSymbol, Modal, PageHeader } from '@/ui/component';
import LessPalette from '@/ui/style/var-defs';
import { CHAINS_ENUM } from '@debank/common';
import { CHAINS } from 'consts';
import { Button, Space, Tooltip } from 'antd';
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { ReactComponent as IconTransform } from '@/ui/assets/swap/transform.svg';
import BigNumber from 'bignumber.js';
import { ReactComponent as IconArrowDown } from '@/ui/assets/swap/arrow-down-light.svg';
import ArrowRight from '@/ui/assets/arrow-right.svg';
import { ReactComponent as IconSetting } from '@/ui/assets/swap/setting.svg';
import bg from '@/ui/assets/swap/bg.svg';
import clsx from 'clsx';
import { ReactComponent as IconInfo } from 'ui/assets/infoicon.svg';

const SwapConfirmContainer = styled.div`
  position: relative;
  padding: 12px;
  padding-top: 0;
  background-color: #f0f2f5;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-image: url(${bg});
  background-repeat: no-repeat;
  background-position: 0 0;
`;

const TokenSwapSection = styled.div<{
  isError: boolean;
}>`
  height: ${(props) => (props.isError ? 'auto' : '280px')};
  padding: 32px 20px;
  padding-bottom: 28px;
  background-color: ${LessPalette['@color-white']};
  border: 1px solid #e5e9ef;
  border-radius: 20px;
`;

const Chain = styled.div`
  display: flex;
  height: 40px;
  margin-bottom: -15px;
  padding-top: 6px;
  padding-left: 9px;
  padding-right: 13px;
  width: 92px;
  background: ${LessPalette['@color-white']};
  border-radius: 4px;
  text-align: center;
  font-weight: 300;
  font-size: 12px;
  line-height: 14px;
  color: ${LessPalette['@primary-color']};
  .bold {
    font-weight: 400;
    margin-left: 2px;
  }
`;
const QuoteSelectedTag = styled.div<{
  isBestQuote: boolean;
}>`
  position: absolute;
  right: 12px;
  top: -12px;
  height: 20px;
  padding: 4px;
  background-color: ${(props) =>
    LessPalette[props.isBestQuote ? '@primary-color' : '@color-comment']};
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
`;

export const SwapConfirm = ({
  chain,
  payToken,
  receiveToken,
  amount,
  receiveAmount,
  isBestQuote,
  openQuotesList,
  slippage,
  backToSwap,
  countDown,
  handleSwap,
}: {
  chain: CHAINS_ENUM;
  payToken: TokenItem;
  receiveToken: TokenItem;
  slippage: number | string;
  amount: string | number;
  receiveAmount: string | number;
  isBestQuote: boolean;
  openQuotesList: () => void;
  backToSwap: () => void;
  countDown: number;
  handleSwap: () => void;
}) => {
  const { t } = useTranslation();

  const history = useHistory();
  const handleClickBack = () => {
    history.replace('/');
  };

  const [slippageModal, setSlippageModal] = useState(false);
  const [exchangePrizeInvert, setExchangePrizeInvert] = useState(false);

  const exchangeDisplay = useMemo(() => {
    const t1 = {
      num: new BigNumber(amount),
      symbol: getTokenSymbol(payToken),
    };
    const t2 = {
      num: new BigNumber(receiveAmount),
      symbol: getTokenSymbol(receiveToken),
    };

    let n1 = t1,
      n2 = t2;
    if (exchangePrizeInvert) {
      n1 = t2;
      n2 = t1;
    }

    const v = n2.num.div(n1.num);

    return `1 ${n1.symbol} = ${v.toFixed(2, BigNumber.ROUND_FLOOR)} ${
      n2.symbol
    } `;
  }, [exchangePrizeInvert, amount, payToken, receiveToken]);

  const noUsePrice = !(payToken.price && receiveToken.price);

  const { priceDifference, priceDifferenceIsHigh } = useMemo(() => {
    const payTokenUsd = new BigNumber(amount).times(payToken.price);
    const receiveTokenUsd = new BigNumber(receiveAmount).times(
      receiveToken.price
    );
    const difference = payTokenUsd.minus(receiveTokenUsd).div(receiveTokenUsd);
    return {
      priceDifference: difference.times(100).toFixed(2),
      priceDifferenceIsHigh: difference.gt(0.05),
    };
  }, [receiveToken, payToken]);

  return (
    <SwapConfirmContainer>
      <div className="-mt-12">
        <PageHeader onBack={handleClickBack} forceShowBack invertBack>
          &nbsp;&nbsp;
        </PageHeader>
      </div>
      <div className="flex justify-between px-[20px]">
        <Chain>
          On <span className="bold">{CHAINS[chain].name}</span>
        </Chain>

        <div className="text-white text-12 pt-[6px]">
          {countDown === 0 ? 'Refreshing' : `Refresh after ${countDown} s`}
        </div>
      </div>
      <TokenSwapSection isError={noUsePrice || priceDifferenceIsHigh}>
        <UnableEstimatePriceBox className={!noUsePrice ? 'hidden' : ''} />
        <PrizeDifferenceBox
          className={!priceDifferenceIsHigh ? 'hidden' : ''}
          diff={priceDifference}
          amount={amount}
          receiveAmount={receiveAmount}
          payToken={payToken}
          receiveToken={receiveToken}
        />

        <div className="flex justify-center items-end">
          <Space size={6}>
            <img
              className="rounded-full"
              width={20}
              height={20}
              src={payToken.logo_url}
              alt={payToken.display_symbol || payToken.symbol}
            />
            <div
              className="inline-flex items-baseline"
              title={amount + '' + (payToken.display_symbol || payToken.symbol)}
            >
              <div className="text-20 text-gray-title max-w-[200px] truncate">
                {amount}
              </div>
              <div className="ml-6 text-15 text-gray-subTitle">
                {payToken.display_symbol || payToken.symbol}
              </div>
            </div>
          </Space>
        </div>

        <div className="mt-[13px] mb-20 mx-auto flex justify-center">
          <IconArrowDown />
        </div>
        <div className="relative flex justify-center items-center  h-[64px] bg-blue-light bg-opacity-10 rounded">
          <Space size={6}>
            <img
              className="rounded-full"
              width={28}
              height={28}
              src={receiveToken.logo_url}
              alt={receiveToken.display_symbol || receiveToken.symbol}
            />
            <div
              className="inline-flex items-baseline"
              title={receiveAmount + '' + getTokenSymbol(receiveToken)}
            >
              <div className="text-28 font-extrabold text-gray-title max-w-[240px] truncate">
                {new BigNumber(receiveAmount).toFixed(2, BigNumber.ROUND_FLOOR)}
              </div>
              <div className="ml-8 text-15 text-gray-subTitle">
                {receiveToken.display_symbol || receiveToken.symbol}
              </div>
            </div>
          </Space>
          <QuoteSelectedTag
            isBestQuote={isBestQuote}
            role="button"
            onClick={openQuotesList}
          >
            <span className="text-12 text-white">
              {t(isBestQuote ? 'BestQuote' : 'SelectedQuote')}
            </span>
            <div className="h-[14px] w-[14px] ">
              <img src={ArrowRight} alt="" />
            </div>
          </QuoteSelectedTag>
        </div>

        <div className="flex items-center justify-center mt-[32px]">
          <span className="text-13 text-gray-subTitle">{exchangeDisplay}</span>
          <IconTransform
            className="cursor-pointer"
            onClick={() => {
              setExchangePrizeInvert((e) => !e);
            }}
          />
        </div>
      </TokenSwapSection>

      <div className="flex items-center justify-center mt-[24px]">
        <div>
          {t('MaxSlippage')}: {slippage}%
        </div>
        <IconSetting
          className="cursor-pointer ml-[2px]"
          onClick={() => setSlippageModal(true)}
        />
      </div>

      <div className="text-center text-12 text-orange mt-[8px] h-[14px]">
        {slippage < 0.1
          ? t('LowSlippageToleranceWarn')
          : slippage > 5 && slippage < 15
          ? t('HighSlippageToleranceWarn')
          : ''}
      </div>
      <div
        className={clsx('mt-auto flex justify-center')}
        style={{
          marginTop: 'auto',
          marginBottom: noUsePrice || priceDifferenceIsHigh ? 0 : 50,
        }}
      >
        <Button
          type="primary"
          size="large"
          className="w-[200px]"
          onClick={handleSwap}
        >
          {t('Swap')}
        </Button>
      </div>

      <Modal
        onCancel={() => setSlippageModal(false)}
        visible={slippageModal}
        bodyStyle={{
          padding: 36,
          paddingBottom: 32,
          height: 170,
        }}
        footer={null}
      >
        <div className="flex flex-col justify-between h-full">
          <div className="text-center text-15 text-gray-title">
            {t('ChangeSlippage')}
          </div>
          <Button
            style={{
              width: 168,
            }}
            type="primary"
            size="large"
            className="mx-auto"
            onClick={() => {
              setSlippageModal(false);
              backToSwap();
            }}
          >
            {t('Confirm')}
          </Button>
        </div>
      </Modal>
    </SwapConfirmContainer>
  );
};

const UnableEstimatePriceBox = ({ className = '' }) => {
  return (
    <div
      className={clsx(
        'flex flex-col justify-between bg-gray-bg rounded px-12  mt-[20px]',
        className
      )}
    >
      <p className="mt-[12px] text-14 font-medium text-gray-title">
        Unable to estimate the price difference in USD
      </p>
      <p className="mb-[12px] text-12 text-gray-subTitle">
        Because we fail to get the token value in USD, we can't compare the
        price difference for this transaction.
      </p>
    </div>
  );
};

const PrizeDifferenceBox = ({
  diff,
  amount,
  receiveAmount,
  payToken,
  receiveToken,
  className,
}: {
  className?: string;
  diff: string;
  amount: string | number;
  receiveAmount: string | number;
  payToken: TokenItem;
  receiveToken: TokenItem;
}) => {
  return (
    <div
      className={clsx(
        'bg-orange bg-opacity-20 rounded border border-orange px-12 py-12 mb-20',
        className
      )}
    >
      <div className="flex justify-between mb-12">
        <div className="w-[263px] text-gray-title text-14 font-medium">
          The price difference is too high: {diff}% This will lead to an unideal
          trade
        </div>
        <Tooltip
          align={{
            targetOffset: [-12, 0],
          }}
          overlayClassName={'rectangle'}
          placement="bottomRight"
          title={
            'The price difference (price impact) is affected by the size of your transaction and the liquidity source. A high price impact will occur when the tokens are in limited supply. '
          }
        >
          <IconInfo />
        </Tooltip>
      </div>
      <div>
        {amount} {getTokenSymbol(payToken)} ≈ $
        {new BigNumber(amount)
          .times(payToken.price)
          .toFixed(2, BigNumber.ROUND_FLOOR)}
      </div>

      <div>
        {receiveAmount} {getTokenSymbol(receiveToken)} ≈ $
        {new BigNumber(receiveAmount)
          .times(receiveToken.price)
          .toFixed(2, BigNumber.ROUND_FLOOR)}
      </div>
    </div>
  );
};

export default SwapConfirm;
