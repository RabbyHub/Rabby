import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import BigNumber from 'bignumber.js';
import { useWallet } from '@/ui/utils';
import useIntervalEffect from '@/ui/hooks/useIntervalEffect';
import QuotesListDrawer, { Quote } from './components/QuotesListDrawer';
import QuoteLoading from './components/QuoteLoading';
import SwapConfirm from './components/SwapConfirm';
import { obj2query, query2obj } from '@/ui/utils/url';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { RABBY_SWAP_ROUTER, SWAP_AVAILABLE_VALUE_RATE } from '@/constant';
import { message } from 'antd';

export const SwapQuotes = () => {
  const { t } = useTranslation();
  const wallet = useWallet();

  const history = useHistory();
  const { search } = useLocation();

  const [searchObj] = useState(query2obj(search));
  const [shouldApprove, setShouldApprove] = useState(false);

  const {
    chain_enum,
    chain: chain_id,
    amount,
    rawAmount: pay_token_raw_amount,
    payTokenId: pay_token_id,
    receiveTokenId: receive_token_id,
    slippage,
  } = searchObj;
  const [successCount, setSuccessCount] = useState(0);
  const [dexList, setDexList] = useState<
    Awaited<ReturnType<typeof wallet.openapi.getDEXList>>
  >([]);

  const [swapQuotes, setSwapQuotes] = useState<(Quote & { dexId: string })[]>(
    []
  );
  const isFirstRender = useRef(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  const [end, setEnd] = useState(false);

  const [quotesDrawer, setQuotesDrawer] = useState(false);

  const [countDown, setCountDown] = useState(0);
  const currentDexId = useMemo(() => {
    return swapQuotes?.[currentQuoteIndex]?.dexId || '';
  }, [swapQuotes, currentQuoteIndex]);

  const getQuotes = async () => {
    try {
      const DEXList = await wallet.openapi.getDEXList(chain_id);
      setDexList(DEXList || []);
      const swapQuotes = await Promise.allSettled(
        DEXList.map(
          async (e) =>
            await wallet.openapi
              .getSwapQuote({
                dex_id: e.id,
                chain_id,
                pay_token_id,
                pay_token_raw_amount,
                receive_token_id,
              })
              .then((res) => {
                if (res.dex_approve_to) {
                  setSuccessCount((n) => n + 1);
                }
                return { ...res, dexId: e.id, type: e.type };
              })
        )
      );
      const availableSwapQuotes: Quote[] = [];
      swapQuotes.forEach((e) => {
        if (e.status === 'fulfilled') {
          availableSwapQuotes.push(e.value);
        }
      });

      availableSwapQuotes.sort((a, b) => {
        const getValue = (item: Quote) =>
          new BigNumber(item.receive_token_raw_amount)
            .div(item.receive_token.decimals)
            .times(item.receive_token.price)
            .minus(item.gas.gas_used);
        return getValue(b).minus(getValue(a)).toNumber();
      });

      setSwapQuotes(availableSwapQuotes);
      if (availableSwapQuotes.length < 1) {
        history.replace(
          `/swap?${obj2query({
            ...searchObj,
            fetchQuoteError: t('FailGetQuote'),
          })}`
        );
      }
      setEnd(true);

      setCountDown(30);

      if (currentQuoteIndex !== 0 && currentDexId) {
        const index = availableSwapQuotes.findIndex(
          (e) => e.dexId === currentDexId
        );
        if (index < 0) {
          setCurrentQuoteIndex(0);
        } else {
          setCurrentQuoteIndex(index);
        }
      }
    } catch (error) {
      console.error('get quotes', error?.message);

      history.replace(
        `/swap?${obj2query({
          ...searchObj,
          fetchQuoteError: t('FailGetQuote'),
        })}`
      );
    }
  };

  const feeRemovalReceiveAmount = useMemo(() => {
    if (swapQuotes[currentQuoteIndex]) {
      return new BigNumber(
        swapQuotes[currentQuoteIndex].receive_token_raw_amount
      )
        .times(SWAP_AVAILABLE_VALUE_RATE)
        .div(10 ** swapQuotes[currentQuoteIndex]?.receive_token.decimals)
        .toString();
    }
    return '';
  }, [swapQuotes, currentQuoteIndex]);

  const handleCancel = () => {
    history.replace(`/swap?${obj2query(searchObj)}`);
  };

  const handleSelect = (i) => {
    setCurrentQuoteIndex(i);
    setQuotesDrawer(false);
  };

  const shouldRequestApprove = async () => {
    if (pay_token_id === CHAINS[chain_enum].nativeTokenAddress) {
      return false;
    }
    const allowance = await wallet.getERC20Allowance(
      CHAINS[chain_enum].serverId,
      pay_token_id,
      RABBY_SWAP_ROUTER
    );
    setShouldApprove(new BigNumber(allowance).lt(pay_token_raw_amount));
  };

  const handleSwap = () => {
    const {
      receive_token_raw_amount,
      dex_swap_to,
      dex_approve_to,
      dex_swap_calldata,
      is_wrapped,
    } = swapQuotes[currentQuoteIndex];
    try {
      wallet.rabbySwap({
        chain_server_id: CHAINS[chain_enum].serverId,
        pay_token_id,
        pay_token_raw_amount,
        receive_token_id,
        slippage,
        receive_token_raw_amount,
        dex_swap_to,
        dex_approve_to,
        dex_swap_calldata,
        deadline: Math.floor(Date.now() / 1000) + 3600 * 30,
        needApprove: shouldApprove,
        is_wrapped,
      });
      window.close();
    } catch (e) {
      message.error(e.message);
      console.error(e);
    }
  };

  useEffect(() => {
    shouldRequestApprove();
  }, []);

  useIntervalEffect(
    () => {
      setCountDown((e) => {
        if (e - 1 === 0) {
          getQuotes();
        }
        return e - 1;
      });
    },
    countDown === 0 ? undefined : 1000
  );

  useEffect(() => {
    if (!isFirstRender.current) {
      isFirstRender.current = true;
      getQuotes();
    }
  }, []);
  if (!end) {
    return (
      <QuoteLoading
        successCount={successCount}
        allCount={dexList.length}
        handleCancel={handleCancel}
      />
    );
  }
  return (
    <>
      <SwapConfirm
        chain={chain_enum as CHAINS_ENUM}
        payToken={swapQuotes[currentQuoteIndex].pay_token}
        receiveToken={swapQuotes[currentQuoteIndex].receive_token}
        amount={amount}
        receiveAmount={feeRemovalReceiveAmount}
        isBestQuote={currentQuoteIndex === 0}
        openQuotesList={() => {
          setQuotesDrawer(true);
        }}
        slippage={slippage}
        backToSwap={handleCancel}
        countDown={countDown}
        handleSwap={handleSwap}
        shouldApprove={shouldApprove}
      />
      <QuotesListDrawer
        payAmount={amount}
        currentQuoteIndex={currentQuoteIndex}
        list={swapQuotes}
        visible={quotesDrawer}
        onClose={() => {
          setQuotesDrawer(false);
        }}
        slippage={Number(slippage)}
        handleSelect={handleSelect}
      />
    </>
  );
};
export default SwapQuotes;
