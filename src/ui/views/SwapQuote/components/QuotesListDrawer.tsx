import { getTokenSymbol } from '@/ui/component';
import clsx from 'clsx';
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BestQuoteTag from './BestQuoteTag';
import wallet from '@/background/controller/wallet';
import { Button, Drawer, Space, Tooltip } from 'antd';
import { ReactComponent as IconInfo } from 'ui/assets/infoicon.svg';
import { ReactComponent as IconArronRight } from 'ui/assets/arrow-right-gray.svg';
import BigNumber from 'bignumber.js';
import { SWAP_AVAILABLE_VALUE_RATE } from '@/constant';
import { useCss } from 'react-use';
import { ReactComponent as IconBack } from 'ui/assets/back.svg';
import { ReactComponent as IconClose } from 'ui/assets/swap/modal-close.svg';
import RateExchange from './RateExchange';

export type Quote = Awaited<
  ReturnType<typeof wallet.openapi.getSwapQuote>
>[][number] & { dexId: string; type: string };

export const getReceiveTokenAmountBN = (
  rawAmount: string | number,
  decimals: number
) =>
  new BigNumber(rawAmount).div(10 ** decimals).times(SWAP_AVAILABLE_VALUE_RATE);

const labelClassName =
  'text-14 font-normal text-gray-subTitle flex items-center space-x-2';
const valueClassName = 'text-13 font-medium text-gray-title text-right';

export const QuotesListDrawer = ({
  list,
  visible,
  onClose,
  slippage,
  currentQuoteIndex,
  handleSelect,
  payAmount,
}: {
  list: Quote[];
  visible: boolean;
  onClose: () => void;
  slippage: number;
  currentQuoteIndex: number;
  handleSelect: (index: number) => void;
  payAmount: string;
}) => {
  const { t } = useTranslation();

  const detailsReceivingAmountTooltipsClassName = useCss({
    '& .ant-tooltip-arrow': {
      left: 'calc(50% - 60px )',
    },
  });

  const detailsGasFeeTooltipsClassName = useCss({
    '& .ant-tooltip-arrow': {
      left: 'calc(50% - 102px )',
    },
  });

  const detailsSlippageTooltipsClassName = useCss({
    '& .ant-tooltip-arrow': {
      left: 'calc(50% - 88px )',
    },
  });

  const detailsLiquiditySourceClassName = useCss({
    '& .ant-tooltip-arrow': {
      left: 'calc(50% - 72px)',
    },
  });

  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const data = useMemo(
    () => [
      {
        left: <div className={clsx(labelClassName)}>Rate</div>,
        right: list[selectedIndex] ? (
          <RateExchange
            className={valueClassName}
            payAmount={payAmount}
            receiveAmount={new BigNumber(
              list[selectedIndex].receive_token_raw_amount
            )
              .times(SWAP_AVAILABLE_VALUE_RATE)
              .div(10 ** list[selectedIndex].receive_token.decimals)
              .toString()}
            payToken={list[selectedIndex].pay_token}
            receiveToken={list[selectedIndex].receive_token}
          />
        ) : null,
      },
      {
        left: (
          <div className={clsx(labelClassName)}>
            <span>Receiving amount </span>
            <Tooltip
              overlayClassName={clsx(
                'rectangle max-w-[360px] left-[20px]',
                detailsReceivingAmountTooltipsClassName
              )}
              placement="bottom"
              title={t('ReceivingAmountDesc')}
            >
              <IconInfo />
            </Tooltip>
          </div>
        ),
        right: (
          <div className={clsx(valueClassName)}>
            {getReceiveTokenAmountBN(
              list[selectedIndex]?.receive_token_raw_amount,
              list[selectedIndex]?.receive_token?.decimals || 18
            ).toFixed(2, BigNumber.ROUND_FLOOR)}{' '}
            {getTokenSymbol(list[selectedIndex]?.receive_token)}
          </div>
        ),
      },
      {
        left: (
          <div className={clsx(labelClassName)}>
            <span>Est.gas fee </span>
            <Tooltip
              overlayClassName={clsx(
                'rectangle max-w-[360px] left-[20px]',
                detailsGasFeeTooltipsClassName
              )}
              placement="bottom"
              title={t('EstGasFeeDesc')}
            >
              <IconInfo />
            </Tooltip>
          </div>
        ),
        right: (
          <div
            className={clsx(valueClassName)}
            title={list[selectedIndex]?.gas?.gas_cost_usd_value + ''}
          >
            ${list[selectedIndex]?.gas?.gas_cost_usd_value?.toFixed(2)}
          </div>
        ),
      },
      {
        left: (
          <div className={clsx(labelClassName)}>
            <span>Max slippage </span>
            <Tooltip
              overlayClassName={clsx(
                'rectangle max-w-[360px] left-[20px]',
                detailsSlippageTooltipsClassName
              )}
              placement="bottom"
              title={t('MaxSlippageDesc')}
            >
              <IconInfo />
            </Tooltip>
          </div>
        ),
        right: <div className={clsx(valueClassName)}>{Number(slippage)}%</div>,
      },
      {
        left: (
          <div className={clsx(labelClassName)}>
            <span>Liquidity source </span>
            <Tooltip
              overlayClassName={clsx(
                'rectangle max-w-[360px] left-[20px]',
                detailsLiquiditySourceClassName
              )}
              placement="bottom"
              title={t('LiquiditySourceDesc')}
            >
              <IconInfo />
            </Tooltip>
          </div>
        ),
        right: (
          <div className={clsx('capitalize', valueClassName)}>
            {list[selectedIndex]?.type}
          </div>
        ),
      },
    ],
    [
      t,
      slippage,
      list[selectedIndex]?.receive_token_raw_amount,
      list[selectedIndex]?.receive_token,
      list[selectedIndex]?.gas?.gas_cost_usd_value,
    ]
  );

  const handleQuote = () => {
    handleSelect(selectedIndex);
    setSelectedIndex(-1);
  };
  const receivingAmountTooltipsClassName = useCss({
    '& .ant-tooltip-arrow': {
      left: 'calc(50% - 62px )',
    },
  });

  const gasFeeTooltipsClassName = useCss({
    '& .ant-tooltip-arrow': {
      left: 'calc(50% + 76px )',
    },
  });

  return (
    <Drawer
      closable={false}
      placement="bottom"
      height="512px"
      visible={visible}
      onClose={onClose}
      destroyOnClose
      className="dddd"
      bodyStyle={{
        padding: '20px 0',
      }}
      push={false}
    >
      <div className="flex justify-between items-center">
        <div />
        <div className="text-20 font-medium text-center text-gray-title">
          {t('AllQuotes')}
        </div>
        <div className="pr-[20px]">
          <IconClose className="cursor-pointer" onClick={onClose} />
        </div>
      </div>

      <div className="overflow-auto">
        <div className="text-12 text-gray-content pt-[20px] mb-[24px] px-[20px] ">
          {t('QuoteDesc')}
          <div className="h-0 mt-16 bg-transparent border-t-[0.5px] border-gray-divider border-solid" />
        </div>
        <Space size={44} className="px-20">
          <Space size={4} className="w-[130px]">
            <div>receiving amount</div>
            <Tooltip
              overlayClassName={clsx(
                'rectangle max-w-[360px] left-[20px]',
                receivingAmountTooltipsClassName
              )}
              placement="bottom"
              title={t('ReceivingAmountDesc')}
            >
              <IconInfo />
            </Tooltip>
          </Space>
          <Space size={4}>
            <div>Est. gas fee</div>
            <Tooltip
              overlayClassName={clsx(
                'rectangle max-w-[360px] left-[20px]',
                gasFeeTooltipsClassName
              )}
              placement="bottom"
              title={
                'This is an estimated gas cost for your transaction. The actual gas cost may change based on network conditions.'
              }
            >
              <IconInfo />
            </Tooltip>
          </Space>
        </Space>

        {list.map((item, index) => (
          <AmountAndGasFeeItem
            key={item.dexId}
            item={item}
            index={index}
            currentQuoteIndex={currentQuoteIndex}
            setSelectedIndex={setSelectedIndex}
          />
        ))}
      </div>

      <Drawer
        closable={false}
        placement="bottom"
        height="512px"
        visible={!!list[selectedIndex]}
        onClose={() => setSelectedIndex(-1)}
        destroyOnClose
        className="dddd"
        getContainer={false}
        contentWrapperStyle={{
          boxShadow: '0px -12px 20px rgba(82, 86, 115, 0.1)',
          borderRadius: '16px 16px 0px 0',
        }}
      >
        <div className="flex justify-between items-center">
          <IconBack
            className="cursor-pointer"
            onClick={() => setSelectedIndex(-1)}
          />
          <div className="text-20 font-medium text-center text-gray-title ">
            {t('QuoteDetails')}
          </div>
          <IconClose
            className="cursor-pointer"
            onClick={() => setSelectedIndex(-1)}
          />
        </div>

        <div className="flex justify-center">
          {selectedIndex === 0 && <BestQuoteTag className="mt-8" />}
        </div>

        <div>
          {data.map((e, index) => (
            <div
              key={index}
              className="flex h-[52px] items-center justify-between border-b-[0.5px] border-gray-divider "
            >
              {e.left}
              {e.right}
            </div>
          ))}
        </div>

        <div className="mt-[16px] mb-[22px] text-12 leading-[16px] text-gray-content">
          {t('RabbyQuoteDesc')}
        </div>
        <div className="flex justify-center">
          <Button
            size="large"
            type="primary"
            className="w-[168px]"
            onClick={handleQuote}
          >
            {t('useThisQuote')}
          </Button>
        </div>
      </Drawer>
    </Drawer>
  );
};

const AmountAndGasFeeItem = ({
  item,
  index,
  currentQuoteIndex,
  setSelectedIndex,
}: {
  item: Quote;
  index: number;
  currentQuoteIndex: number;
  setSelectedIndex: (i: number) => void;
}) => {
  const amount = useMemo(
    () =>
      getReceiveTokenAmountBN(
        item.receive_token_raw_amount,
        item.receive_token.decimals
      ),
    [item.receive_token_raw_amount, item.receive_token.decimals]
  );
  useEffect(() => {
    if (!item) {
      setSelectedIndex(-1);
    }
  }, [item]);

  if (!item) {
    return null;
  }
  return (
    <div
      key={item.dex_approve_to}
      className={clsx(
        'px-20',
        currentQuoteIndex === index
          ? 'bg-blue-light text-white rounded-[6px]'
          : 'text-gray-title'
      )}
      onClick={() => {
        setSelectedIndex(index);
      }}
    >
      <div
        className={clsx(
          'flex h-[52px] items-center  border-gray-divider  cursor-pointer ',
          currentQuoteIndex === index ? 'border-b-0' : 'border-b-[0.5px]'
        )}
      >
        <Space size={44}>
          <div
            title={amount.toString()}
            className="max-w-[130px] w-[130px] truncate text-15"
          >
            {amount.toFixed(2, BigNumber.ROUND_FLOOR)}
          </div>
          <div
            className="max-w-[130px] truncate text-15"
            title={item.gas?.gas_cost_usd_value + ''}
          >
            ${item.gas?.gas_cost_usd_value?.toFixed(2) || ''}
          </div>
        </Space>
        <Space size={12} className="ml-auto">
          {index === 0 && <BestQuoteTag className="mr-[12px]" />}
          <IconArronRight
            className={clsx(currentQuoteIndex === index && 'brightness-[1000]')}
          />
        </Space>
      </div>
    </div>
  );
};

export default QuotesListDrawer;
