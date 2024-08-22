import {
  FetchActionRequiredData,
  ApproveTokenRequireData,
  BatchRevokePermit2RequireData,
} from '../../types';
import { fetchDataApproveToken } from '../approveToken/fetchData';

export const fetchDataPermit2BatchRevokeToken: FetchActionRequiredData = async (
  options
) => {
  if (options.type !== 'transaction') {
    return {};
  }
  const { actionData } = options;
  const action = actionData.permit2BatchRevokeToken;

  if (!action) {
    return {};
  }

  const spenders = action.revoke_list.map((item) => item.spender);
  // filter out the same spender
  const uniqueSpenders = Array.from(new Set(spenders));

  const result: BatchRevokePermit2RequireData = {};
  await Promise.all(
    uniqueSpenders.map(async (spender) => {
      result[spender] = (await fetchDataApproveToken(options, {
        spender,
      })) as Omit<ApproveTokenRequireData, 'token'>;
    })
  );
  return result;
};
