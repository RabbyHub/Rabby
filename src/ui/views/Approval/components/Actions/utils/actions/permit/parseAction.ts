import { PermitAction } from '@rabby-wallet/rabby-api/dist/types';
import { PartialParseAction } from '../../types';

export const parseActionPermit: PartialParseAction<'typed_data'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'permit1_approve_token') {
    return {};
  }
  return {
    permit: {
      ...(data.data as PermitAction),
      expire_at: data.expire_at,
    },
  };
};
