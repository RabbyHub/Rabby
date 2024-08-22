import { CreateKeyAction } from '@rabby-wallet/rabby-api/dist/types';
import { PartialParseAction } from '../../types';

export const parseActionCreateKey: PartialParseAction<'typed_data' | 'text'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'create_key') {
    return {};
  }
  return {
    createKey: data.data as CreateKeyAction,
  };
};
