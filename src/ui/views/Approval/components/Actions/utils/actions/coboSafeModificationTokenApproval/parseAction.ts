import { SubmitTokenApprovalModificationAction } from '@rabby-wallet/rabby-api/dist/types';
import { PartialParseAction } from '../../types';

export const parseActionCoboSafeModificationTokenApproval: PartialParseAction<'typed_data'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'submit_token_approval_modification') {
    return {};
  }
  return {
    coboSafeModificationTokenApproval: data.data as SubmitTokenApprovalModificationAction,
  };
};
