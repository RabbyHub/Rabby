import { FetchActionRequiredData } from '../../types';
import { fetchDataApproveNFT } from '../approveNFT/fetchData';

export const fetchDataRevokeNFTCollection: FetchActionRequiredData = async (
  options
) => {
  if (options.type !== 'transaction') {
    return {};
  }
  if (!options.actionData.revokeNFTCollection) {
    return {};
  }

  return fetchDataApproveNFT(options, options.actionData.revokeNFTCollection);
};
