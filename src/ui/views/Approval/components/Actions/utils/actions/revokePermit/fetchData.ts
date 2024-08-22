import { FetchActionRequiredData } from '../../types';
import { fetchDataApproveToken } from '../approveToken/fetchData';

export const fetchDataRevokePermit: FetchActionRequiredData = async (
  options
) => {
  if (options.type !== 'typed_data') {
    return {};
  }
  if (!options.actionData.revokePermit) {
    return {};
  }

  return fetchDataApproveToken(options, options.actionData.revokePermit);
};
