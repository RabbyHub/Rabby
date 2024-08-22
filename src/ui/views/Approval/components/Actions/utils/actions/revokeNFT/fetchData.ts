import { FetchActionRequiredData } from '../../types';
import { fetchDataApproveNFT } from '../approveNFT/fetchData';

export const fetchDataRevokeNFT: FetchActionRequiredData = async (options) => {
  if (options.type !== 'transaction') {
    return {};
  }

  if (!options.actionData.revokeNFT) {
    return {};
  }
  return fetchDataApproveNFT(options, options.actionData.revokeNFT);
};
