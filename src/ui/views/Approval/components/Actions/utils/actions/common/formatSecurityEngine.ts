import {
  ContractCallRequireData,
  FormatSecurityEngineContext,
} from '../../types';

export const formatSecurityEngineCommon: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type === 'text') {
    return {};
  }

  if (!options.actionData.common) {
    return {};
  }

  return {
    common: {
      ...options.actionData.common,
      receiverInWallet: (options.requireData as ContractCallRequireData)
        .receiverInWallet,
    },
  };
};
