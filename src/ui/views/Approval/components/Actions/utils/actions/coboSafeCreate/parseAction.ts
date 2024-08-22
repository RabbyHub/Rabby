import { CreateCoboSafeAction } from '@rabby-wallet/rabby-api/dist/types';
import { PartialParseAction } from '../../types';

export const parseActionCoboSafeCreate: PartialParseAction<'typed_data'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'create_cobo_safe') {
    return {};
  }
  return {
    coboSafeCreate: data.data as CreateCoboSafeAction,
  };
};
