import { FetchActionRequiredData } from '../../types';
import { fetchDataContractCall } from '../contractCall/fetchData';

export const fetchDataCommon: FetchActionRequiredData = async (options) => {
  return fetchDataContractCall(options);
};
