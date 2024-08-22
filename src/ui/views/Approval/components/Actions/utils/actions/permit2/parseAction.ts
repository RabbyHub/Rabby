import { Permit2Action } from '@rabby-wallet/rabby-api/dist/types';
import { PartialParseAction } from '../../types';

export const parseActionPermit2: PartialParseAction<'typed_data'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'permit2_approve_token') {
    return {};
  }
  return {
    permit2: {
      ...(data.data as Permit2Action),
      sig_expire_at: data.expire_at,
    },
  };
};
