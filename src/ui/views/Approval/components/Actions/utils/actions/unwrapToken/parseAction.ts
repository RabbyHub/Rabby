import { UnWrapTokenAction } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';
import { calcSlippageTolerance } from '../../utils/calcSlippageTolerance';

export const parseActionUnwrapToken: ParseAction<'transaction'> = (options) => {
  const { data } = options;

  if (data?.type !== 'unwrap_token') {
    return {};
  }

  const { pay_token, receive_token, receiver } = data.data as UnWrapTokenAction;
  const slippageTolerance = calcSlippageTolerance(
    pay_token.raw_amount || '0',
    receive_token.min_raw_amount || '0'
  );
  return {
    unWrapToken: {
      payToken: pay_token,
      receiveToken: receive_token,
      slippageTolerance,
      receiver,
    },
  };
};
