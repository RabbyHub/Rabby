import {
  ApproveNFTRequireData,
  FormatSecurityEngineContext,
} from '../../types';

export const formatSecurityEngineApproveNFT: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'transaction' && options.type !== 'typed_data') {
    return {};
  }
  const { actionData, requireData, chainId, provider } = options;

  if (!actionData.approveNFT || !chainId) {
    return {};
  }
  const data = requireData as ApproveNFTRequireData;
  const { spender } = actionData.approveNFT;
  return {
    nftApprove: {
      chainId,
      spender,
      isEOA: data.isEOA,
      riskExposure: data.riskExposure,
      deployDays: provider.getTimeSpan(
        Math.floor(Date.now() / 1000) - data.bornAt
      ).d,
      hasInteracted: data.hasInteraction,
      isDanger: !!data.isDanger,
    },
  };
};
