import { SubmitSafeRoleModificationAction } from '@rabby-wallet/rabby-api/dist/types';
import { PartialParseAction } from '../../types';

export const parseActionCoboSafeModificationRole: PartialParseAction<'typed_data'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'submit_safe_role_modification') {
    return {};
  }
  return {
    coboSafeModificationRole: data.data as SubmitSafeRoleModificationAction,
  };
};
