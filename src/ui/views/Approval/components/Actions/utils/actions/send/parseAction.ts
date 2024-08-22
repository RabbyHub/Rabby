import { SendAction } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';

export const parseActionSend: ParseAction = (options) => {
  const { data } = options;

  if (data?.type !== 'send_token') {
    return {};
  }

  return {
    send: data.data as SendAction,
  };
};
