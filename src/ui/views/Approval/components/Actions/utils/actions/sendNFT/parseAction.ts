import { SendNFTAction } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';

export const parseActionSendNFT: ParseAction<'transaction'> = (options) => {
  const { data } = options;

  if (data?.type !== 'send_nft') {
    return {};
  }

  return {
    sendNFT: data.data as SendNFTAction,
  };
};
