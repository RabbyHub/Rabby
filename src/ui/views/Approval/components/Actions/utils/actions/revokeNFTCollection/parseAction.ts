import { RevokeNFTCollectionAction } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';

export const parseActionRevokeNFTCollection: ParseAction<'transaction'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'revoke_collection') {
    return {};
  }

  return {
    revokeNFTCollection: data.data as RevokeNFTCollectionAction,
  };
};
