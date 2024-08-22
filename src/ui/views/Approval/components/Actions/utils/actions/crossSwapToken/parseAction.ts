import BigNumber from 'bignumber.js';
import { CrossSwapAction } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';
import { calcUSDValueChange } from '../../utils/calcUSDValueChange';

export const parseActionCrossSwapToken: ParseAction<'transaction'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'cross_swap_token') {
    return {};
  }

  const {
    pay_token: payToken,
    receive_token: receiveToken,
    receiver,
  } = data.data as CrossSwapAction;
  const receiveTokenUsdValue = new BigNumber(receiveToken.min_raw_amount)
    .div(10 ** receiveToken.decimals)
    .times(receiveToken.price);
  const payTokenUsdValue = new BigNumber(payToken.raw_amount || '0')
    .div(10 ** payToken.decimals)
    .times(payToken.price);
  const usdValueDiff = receiveTokenUsdValue.minus(payTokenUsdValue).toFixed();
  const usdValuePercentage = calcUSDValueChange(
    payTokenUsdValue.toFixed(),
    receiveTokenUsdValue.toFixed()
  );

  return {
    crossSwapToken: {
      payToken,
      receiveToken,
      receiver,
      usdValueDiff,
      usdValuePercentage,
    },
  };
};
