import { SubmitDelegatedAddressModificationAction } from '@rabby-wallet/rabby-api/dist/types';
import { PartialParseAction } from '../../types';

export const parseActionCoboSafeModificationDelegatedAddress: PartialParseAction<'typed_data'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'submit_delegated_address_modification') {
    return {};
  }
  return {
    coboSafeModificationDelegatedAddress: data.data as SubmitDelegatedAddressModificationAction,
  };
};
