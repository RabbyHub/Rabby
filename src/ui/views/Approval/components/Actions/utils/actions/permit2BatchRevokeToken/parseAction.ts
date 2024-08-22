import { ParseAction } from '../../types';

export const parseActionPermit2BatchRevokeToken: ParseAction<'transaction'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'permit2_batch_revoke_token') {
    return {};
  }
  return {
    permit2BatchRevokeToken: data.data as any,
  };
};
