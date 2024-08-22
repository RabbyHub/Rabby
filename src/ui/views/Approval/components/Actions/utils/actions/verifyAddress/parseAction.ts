import { VerifyAddressAction } from '@rabby-wallet/rabby-api/dist/types';
import { PartialParseAction } from '../../types';

export const parseActionVerifyAddress: PartialParseAction<
  'typed_data' | 'text'
> = (options) => {
  const { data } = options;

  if (data?.type !== 'verify_address') {
    return {};
  }
  return {
    verifyAddress: data.data as VerifyAddressAction,
  };
};
