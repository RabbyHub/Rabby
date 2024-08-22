import { FetchActionRequiredData } from '../../types';
import { fetchDataApproveToken } from '../approveToken/fetchData';

export const fetchDataRevokePermit2: FetchActionRequiredData = async (
  options
) => {
  if (options.type !== 'transaction') {
    return {};
  }
  if (!options.actionData.revokePermit2) {
    return {};
  }
  return fetchDataApproveToken(options, options.actionData.revokePermit2);
};
