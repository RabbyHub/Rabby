import { RevokeTokenApproveAction } from '@rabby-wallet/rabby-api/dist/types';
import { PartialParseAction } from '../../types';

export const parseActionRevokePermit: PartialParseAction<'typed_data'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'permit1_revoke_token') {
    return {};
  }
  return {
    revokePermit: data.data as RevokeTokenApproveAction,
  };
};
