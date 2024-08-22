import { SwapTokenOrderAction } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import { calcUSDValueChange } from '../../utils/calcUSDValueChange';
import { PartialParseAction } from '../../types';

export const parseActionSwapTokenOrder: PartialParseAction<'typed_data'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'swap_token_order') {
    return {};
  }
  const actionData = data.data as SwapTokenOrderAction;
  const receiveTokenUsdValue = new BigNumber(
    actionData.receive_token.raw_amount || '0'
  )
    .div(10 ** actionData.receive_token.decimals)
    .times(actionData.receive_token.price);
  const payTokenUsdValue = new BigNumber(actionData.pay_token.raw_amount || '0')
    .div(10 ** actionData.pay_token.decimals)
    .times(actionData.pay_token.price);
  const usdValueDiff = receiveTokenUsdValue.minus(payTokenUsdValue).toFixed();
  const usdValuePercentage = calcUSDValueChange(
    payTokenUsdValue.toFixed(),
    receiveTokenUsdValue.toFixed()
  );
  return {
    swapTokenOrder: {
      payToken: actionData.pay_token,
      receiveToken: actionData.receive_token,
      receiver: actionData.receiver,
      usdValueDiff,
      usdValuePercentage,
      expireAt: actionData.expire_at,
    },
  };
};
