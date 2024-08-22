import { ApproveNFTAction } from '@rabby-wallet/rabby-api/dist/types';
import { ParseAction } from '../../types';

export const parseActionApproveNFT: ParseAction = (options) => {
  const { data } = options;

  if (data?.type !== 'approve_nft') {
    return {};
  }
  return {
    approveNFT: data.data as ApproveNFTAction,
  };
};
