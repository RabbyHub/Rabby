import { RevokePermit2Action } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';

export const parseActionRevokePermit2: ParseAction<'transaction'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'permit2_revoke_token') {
    return {};
  }

  const { spender, token } = data.data as RevokePermit2Action;
  return {
    revokePermit2: {
      spender,
      token,
    },
  };
};
