import { BatchPermit2Action } from '@rabby-wallet/rabby-api/dist/types';
import { PartialParseAction } from '../../types';

export const parseActionBatchPermit2: PartialParseAction<'typed_data'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'permit2_approve_token_list') {
    return {};
  }
  return {
    batchPermit2: {
      ...(data.data as BatchPermit2Action),
      sig_expire_at: data.expire_at,
    },
  };
};
