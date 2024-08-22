import { FetchActionRequiredData, PushMultiSigRequireData } from '../../types';

export const fetchDataPushMultiSig: FetchActionRequiredData = async (
  options
) => {
  if (options.type !== 'transaction') {
    return {};
  }
  const { apiProvider, actionData } = options;

  if (!actionData.pushMultiSig) {
    return {};
  }

  const result: PushMultiSigRequireData = {
    contract: null,
    id: actionData.pushMultiSig.multisig_id,
  };
  const { desc } = await apiProvider.addrDesc(
    actionData.pushMultiSig.multisig_id
  );
  if (desc.contract) {
    result.contract = desc.contract;
  }
  return result;
};
