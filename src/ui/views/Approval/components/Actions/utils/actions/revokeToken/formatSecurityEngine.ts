import { FormatSecurityEngineContext } from '../../types';

export const formatSecurityEngineRevokeToken: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'transaction') {
    return {};
  }
  const { actionData, requireData, chainId, provider } = options;

  if (!actionData.revokeToken) {
    return {};
  }

  const { gasUsed } = actionData.revokeToken;
  return {
    revokeApprove: {
      gasUsed,
      chainId,
    },
  };
};
