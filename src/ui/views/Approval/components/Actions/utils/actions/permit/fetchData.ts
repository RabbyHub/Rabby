import { FetchActionRequiredData } from '../../types';
import { fetchDataApproveToken } from '../approveToken/fetchData';

export const fetchDataPermit: FetchActionRequiredData = async (options) => {
  if (options.type !== 'typed_data') {
    return {};
  }
  if (!options.actionData.permit) {
    return {};
  }

  return fetchDataApproveToken(options, options.actionData.permit);
};
