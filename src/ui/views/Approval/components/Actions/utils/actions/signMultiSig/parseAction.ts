import { SignMultiSigActions } from '@rabby-wallet/rabby-api/dist/types';
import { PartialParseAction } from '../../types';

export const parseActionSignMultiSig: PartialParseAction<'typed_data'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'sign_multisig') {
    return {};
  }
  return {
    signMultiSig: data.data as SignMultiSigActions,
  };
};
