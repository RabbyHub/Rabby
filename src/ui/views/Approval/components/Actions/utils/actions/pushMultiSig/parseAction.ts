import { PushMultiSigAction } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';

export const parseActionPushMultiSig: ParseAction<'transaction'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'push_multisig') {
    return {};
  }

  return {
    pushMultiSig: data.data as PushMultiSigAction,
  };
};
