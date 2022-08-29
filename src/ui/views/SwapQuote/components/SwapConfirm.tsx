import { TokenItem } from '@/background/service/openapi';
import { getTokenSymbol, Modal, PageHeader } from '@/ui/component';
import LessPalette from '@/ui/style/var-defs';
import { CHAINS_ENUM } from '@debank/common';
import { CHAINS } from 'consts';
import { Button, Space, Tooltip } from 'antd';
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { ReactComponent as IconArrowDown } from '@/ui/assets/swap/arrow-down-light.svg';
import ArrowRight from '@/ui/assets/arrow-right.svg';
import { ReactComponent as IconSetting } from '@/ui/assets/swap/setting.svg';
import bg from '@/ui/assets/swap/bg.svg';
import clsx from 'clsx';
import { ReactComponent as IconInfo } from 'ui/assets/infoicon.svg';
import { ReactComponent as IconButtonInfo } from 'ui/assets/swap/button-info.svg';
import IconUnknown from 'ui/assets/token-default.svg';

import RateExchange, { toSignificantDigits } from './RateExchange';
import { useCss } from 'react-use';

const SwapConfirmContainer = styled.div`
  position: relative;
  padding: 20px;
  padding-top: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  background-image: url(${bg});
  background-repeat: no-repeat;
  background-position: 0 0;
`;

const TokenSwapSection = styled.div`
  height: 320px;
  padding: 32px 20px;
  padding-bottom: 28px;
  background-color: ${LessPalette['@color-white']};
  border: 1px solid #e5e9ef;
  border-radius: 20px;
`;

const Chain = styled.div`
  display: flex;
  width: auto;
  height: 40px;
  margin-bottom: -15px;
  padding-top: 6px;
  padding-left: 9px;
  padding-right: 13px;
  background: ${LessPalette['@color-white']};
  border-radius: 4px;
  text-align: center;
  font-weight: 400;
  font-size: 12px;
  line-height: 14px;
  color: ${LessPalette['@primary-color']};
`;
const QuoteSelectedTag = styled.div<{
  isBestQuote: boolean;
}>`
  position: absolute;
  right: 12px;
  top: -12px;
  height: 20px;
  padding: 3px 9px;
  background-color: ${(props) =>
    LessPalette[props.isBestQuote ? '@primary-color' : '@color-comment']};
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
`;

const CountDown = styled.span<{
  warn?: boolean;
}>`
  color: ${(props) => (props.warn ? '#ffe819' : 'inherit')};
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
  shouldApprove,
  handleClickBack,
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
  shouldApprove: boolean;
  handleClickBack: () => void;
}) => {
  const { t } = useTranslation();

  const [slippageModal, setSlippageModal] = useState(false);

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

  const tokenApproveAndSwapTip = useCss({
    '& .ant-tooltip-arrow': {
      left: 'calc(50% + 64px )',
    },
  });

  return (
    <SwapConfirmContainer
      className={clsx(
        !noUsePrice && !priceDifferenceIsHigh && 'pb-[48px]',
        noUsePrice && 'pb-32',
        priceDifferenceIsHigh && 'pb-24'
      )}
    >
      <div className="-mt-12">
        <PageHeader onBack={handleClickBack} forceShowBack invertBack>
          &nbsp;&nbsp;
        </PageHeader>
      </div>
      <div className="flex justify-between px-[20px]">
        <Chain>
          On{' '}
          <span className="font-medium text-13 ml-2">{CHAINS[chain].name}</span>
        </Chain>

        <div className="text-white text-12 pt-[6px]">
          {countDown === 0 ? (
            'Refreshing'
          ) : (
            <>
              Refresh after{' '}
              <CountDown warn={countDown <= 10}>{countDown}</CountDown> s
            </>
          )}
        </div>
      </div>
      <TokenSwapSection
        className={clsx(
          !noUsePrice && !priceDifferenceIsHigh && 'h-[320px]',
          noUsePrice && 'h-[360px] pt-20',
          priceDifferenceIsHigh && 'h-[379px] pt-20'
        )}
      >
        <UnableEstimatePriceBox className={!noUsePrice ? 'hidden' : ''} />
        <PrizeDifferenceBox
          className={!priceDifferenceIsHigh || noUsePrice ? 'hidden' : ''}
          diff={priceDifference}
          amount={amount}
          receiveAmount={receiveAmount}
          payToken={payToken}
          receiveToken={receiveToken}
        />

        <div className="flex justify-center items-end">
          <Space size={6}>
            <img
              className="rounded-full "
              style={{
                border: '1px solid rgba(229, 233, 239)',
              }}
              width={22}
              height={22}
              src={payToken.logo_url}
              alt={payToken.display_symbol || payToken.symbol}
            />
            <div
              className="inline-flex items-baseline font-medium"
              title={amount + '' + (payToken.display_symbol || payToken.symbol)}
            >
              <div className="text-20  text-gray-title max-w-[200px] truncate">
                {amount}
              </div>
              <div className="ml-6 text-15 text-gray-subTitle">
                {payToken.display_symbol || payToken.symbol}
              </div>
            </div>
          </Space>
        </div>

        <div className="mt-[6px] mb-20 mx-auto flex justify-center">
          <IconArrowDown />
        </div>
        <div className="relative h-[100px] pb-16 bg-blue-light bg-opacity-10 rounded">
          <div className="flex justify-center items-center pt-14 pb-8">
            <img
              className="rounded-full"
              width={20}
              height={20}
              src={receiveToken.logo_url || IconUnknown}
              alt={receiveToken.display_symbol || receiveToken.symbol}
            />
            <div className="ml-8 text-15 font-medium text-gray-subTitle">
              {receiveToken.display_symbol || receiveToken.symbol}
            </div>
          </div>
          <div
            className="relative -top-2 text-center text-[36px] font-medium text-gray-title max-w-[320px] px-6 truncate"
            title={receiveAmount + '' + getTokenSymbol(receiveToken)}
          >
            {toSignificantDigits(new BigNumber(receiveAmount))}
          </div>
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

        <RateExchange
          className="justify-center mt-[24px] font-medium"
          payAmount={amount}
          receiveAmount={receiveAmount}
          payToken={payToken}
          receiveToken={receiveToken}
        />
      </TokenSwapSection>

      <div className="flex items-center justify-center mt-[24px]">
        <div>
          {t('MaxSlippage')}: {slippage}%
        </div>
        <IconSetting
          className="cursor-pointer ml-4"
          onClick={() => setSlippageModal(true)}
        />
      </div>

      <div className="text-center text-12 text-orange mt-[8px] h-[14px]">
        {slippage < 0.1
          ? t('LowSlippageToleranceWarn')
          : slippage > 5 && slippage <= 15
          ? t('HighSlippageToleranceWarn')
          : ''}
      </div>
      <div
        className={clsx('mt-auto flex justify-center')}
        style={{
          marginTop: 'auto',
        }}
      >
        <Button
          type="primary"
          size="large"
          className="min-w-[280px]  h-[52px]"
          onClick={handleSwap}
        >
          {shouldApprove ? (
            <div className="flex items-center justify-center gap-2">
              <span>{t('Approve and Swap')}</span>
              <Tooltip
                overlayClassName={clsx(
                  'rectangle  max-w-[360px] w-[360px] left-[20px]',
                  tokenApproveAndSwapTip
                )}
                placement="top"
                title={
                  <>
                    2 transactions need to be signed: <br />
                    1. Allow Rabby smart contracts to use your{' '}
                    {getTokenSymbol(payToken)} <br />
                    2.Confirm to swap
                  </>
                }
              >
                <IconButtonInfo />
              </Tooltip>
            </div>
          ) : (
            t('Swap')
          )}
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
          <div className="text-center text-15 text-gray-title font-medium">
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
        'flex flex-col justify-between bg-gray-bg rounded px-12 mb-[18px]',
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
        'h-[102px] bg-orange bg-opacity-20 rounded border border-orange px-12 py-12 mb-16 flex flex-col justify-between',
        className
      )}
    >
      <div className="flex justify-between">
        <div className="w-[263px] text-gray-title text-14 leading-[16px] font-medium">
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
      <div className="text-12 text-gray-subTitle font-medium">
        <div>
          {toSignificantDigits(new BigNumber(amount))}{' '}
          {getTokenSymbol(payToken)} ≈ $
          {toSignificantDigits(new BigNumber(amount).times(payToken.price))}
        </div>

        <div>
          {toSignificantDigits(new BigNumber(receiveAmount))}{' '}
          {getTokenSymbol(receiveToken)} ≈ $
          {toSignificantDigits(
            new BigNumber(receiveAmount).times(receiveToken.price)
          )}
        </div>
      </div>
    </div>
  );
};

export default SwapConfirm;
