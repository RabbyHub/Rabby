import { RevokeNFTAction } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';

export const parseActionRevokeNFT: ParseAction<'transaction'> = (options) => {
  const { data } = options;

  if (data?.type !== 'revoke_nft') {
    return {};
  }

  return {
    revokeNFT: data.data as RevokeNFTAction,
  };
};
