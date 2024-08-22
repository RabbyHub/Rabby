import BigNumber from 'bignumber.js';
import { CrossTokenAction } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';
import { calcUSDValueChange } from '../../utils/calcUSDValueChange';

export const parseActionCrossToken: ParseAction<'transaction'> = (options) => {
  const { data } = options;

  if (data?.type !== 'cross_token') {
    return {};
  }

  const {
    pay_token: payToken,
    receive_token: receiveToken,
    receiver,
  } = data.data as CrossTokenAction;
  const receiveTokenUsdValue = new BigNumber(receiveToken.min_amount).times(
    receiveToken.price
  );
  const payTokenUsdValue = new BigNumber(payToken.amount).times(payToken.price);
  const usdValueDiff = receiveTokenUsdValue.minus(payTokenUsdValue).toFixed();
  const usdValuePercentage = calcUSDValueChange(
    payTokenUsdValue.toFixed(),
    receiveTokenUsdValue.toFixed()
  );
  return {
    crossToken: {
      payToken,
      receiveToken,
      receiver,
      usdValueDiff,
      usdValuePercentage,
    },
  };
};
