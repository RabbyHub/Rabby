import {
  ApproveTokenRequireData,
  FormatSecurityEngineContext,
} from '../../types';

export const formatSecurityEnginePermit: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'typed_data') {
    return {};
  }
  const { actionData, requireData, chainId, provider } = options;

  if (!actionData.permit) {
    return {};
  }

  const data = requireData as ApproveTokenRequireData;
  return {
    permit: {
      spender: actionData.permit.spender,
      isEOA: data.isEOA,
      riskExposure: data.riskExposure,
      deployDays: provider.getTimeSpan(
        Math.floor(Date.now() / 1000) - data.bornAt
      ).d,
      hasInteracted: data.hasInteraction,
      isDanger: !!data.isDanger,
      chainId,
    },
  };
};
