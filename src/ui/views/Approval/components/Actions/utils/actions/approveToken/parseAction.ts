import { ApproveAction } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';

export const parseActionApproveToken: ParseAction<'transaction'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'approve_token') {
    return {};
  }

  const { spender, token } = data.data as ApproveAction;

  return {
    approveToken: {
      spender,
      token,
    },
  };
};
