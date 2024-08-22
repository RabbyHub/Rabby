import { WrapTokenAction } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';
import { calcSlippageTolerance } from '../../utils/calcSlippageTolerance';

export const parseActionWrapToken: ParseAction<'transaction'> = (options) => {
  const { data } = options;

  if (data?.type !== 'wrap_token') {
    return {};
  }

  const { pay_token, receive_token, receiver } = data.data as WrapTokenAction;
  const slippageTolerance = calcSlippageTolerance(
    pay_token.raw_amount || '0',
    receive_token.min_raw_amount || '0'
  );
  return {
    wrapToken: {
      payToken: pay_token,
      receiveToken: receive_token,
      slippageTolerance,
      receiver,
    },
  };
};
