import BigNumber from 'bignumber.js';
import { SwapAction } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';
import { calcSlippageTolerance } from '../../utils/calcSlippageTolerance';
import { calcUSDValueChange } from '../../utils/calcUSDValueChange';
import { isSameAddress } from '../../utils/isSameAddress';

export const parseActionSwap: ParseAction<'transaction'> = (options) => {
  const { data, balanceChange, preExecVersion, tx } = options;

  if (data?.type !== 'swap_token') {
    return {};
  }

  const {
    pay_token: payToken,
    receive_token: receiveToken,
    receiver,
  } = data.data as SwapAction;
  const balanceChangeSuccess = balanceChange.success;
  const supportBalanceChange = preExecVersion !== 'v0';
  const actualReceiveToken = balanceChange.receive_token_list.find((token) =>
    isSameAddress(token.id, receiveToken.id)
  );
  const receiveTokenAmount = actualReceiveToken ? actualReceiveToken.amount : 0;
  const slippageTolerance =
    balanceChangeSuccess && supportBalanceChange
      ? calcSlippageTolerance(
          actualReceiveToken ? actualReceiveToken.raw_amount || '0' : '0',
          receiveToken.min_raw_amount || '0'
        )
      : null;
  const receiveTokenUsdValue = new BigNumber(receiveTokenAmount).times(
    receiveToken.price
  );
  const payTokenUsdValue = new BigNumber(payToken.amount).times(payToken.price);
  const hasReceiver = !isSameAddress(receiver, tx.from);
  const usdValueDiff =
    hasReceiver || !balanceChangeSuccess || !supportBalanceChange
      ? null
      : receiveTokenUsdValue.minus(payTokenUsdValue).toFixed();
  const usdValuePercentage =
    hasReceiver || !balanceChangeSuccess || !supportBalanceChange
      ? null
      : calcUSDValueChange(
          payTokenUsdValue.toFixed(),
          receiveTokenUsdValue.toFixed()
        );
  const minReceive = {
    ...receiveToken,
    amount: receiveToken.min_amount || 0,
  };
  return {
    swap: {
      payToken,
      receiveToken: {
        ...receiveToken,
        amount: receiveTokenAmount,
      },
      minReceive,
      slippageTolerance,
      receiver,
      usdValueDiff,
      usdValuePercentage,
      balanceChange: {
        success: balanceChangeSuccess,
        support: supportBalanceChange,
      },
    },
  };
};
