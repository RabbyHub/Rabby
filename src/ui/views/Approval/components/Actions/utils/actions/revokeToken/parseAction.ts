import { RevokeTokenApproveAction } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';

export const parseActionRevokeToken: ParseAction<'transaction'> = (options) => {
  const { data, gasUsed } = options;

  if (data?.type !== 'revoke_token') {
    return {};
  }

  const { spender, token } = data.data as RevokeTokenApproveAction;
  return {
    revokeToken: {
      spender,
      token,
      gasUsed,
    },
  };
};
