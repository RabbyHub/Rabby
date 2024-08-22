import { ApproveNFTCollectionAction } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';

export const parseActionApproveNFTCollection: ParseAction<'transaction'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'approve_collection') {
    return {};
  }

  return {
    approveNFTCollection: data.data as ApproveNFTCollectionAction,
  };
};
