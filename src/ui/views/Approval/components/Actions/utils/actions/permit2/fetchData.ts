import { FetchActionRequiredData } from '../../types';
import { fetchDataApproveToken } from '../approveToken/fetchData';

export const fetchDataPermit2: FetchActionRequiredData = async (options) => {
  if (options.type !== 'typed_data') {
    return {};
  }
  if (!options.actionData.permit2) {
    return {};
  }

  return fetchDataApproveToken(options, options.actionData.permit2);
};
