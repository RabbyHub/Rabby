import { FetchActionRequiredData, MultiSigRequireData } from '../../types';

export const fetchDataSignMultiSig: FetchActionRequiredData = async (
  options
) => {
  if (options.type !== 'typed_data') {
    return {};
  }
  const { actionData, apiProvider } = options;
  if (!actionData.signMultiSig) {
    return {};
  }

  const result: MultiSigRequireData = {
    contract: null,
    id: actionData.signMultiSig.multisig_id,
  };
  const { desc } = await apiProvider.addrDesc(
    actionData.signMultiSig.multisig_id
  );
  if (desc.contract) {
    result.contract = desc.contract;
  }
  return result;
};
