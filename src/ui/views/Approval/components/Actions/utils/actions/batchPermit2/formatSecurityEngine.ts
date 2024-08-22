import {
  ApproveTokenRequireData,
  FormatSecurityEngineContext,
} from '../../types';

export const formatSecurityEngineBatchPermit2: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'typed_data') {
    return {};
  }

  const { actionData, requireData, chainId, provider } = options;

  if (!actionData.batchPermit2) {
    return {};
  }

  const data = requireData as ApproveTokenRequireData;
  return {
    batchPermit2: {
      spender: actionData.batchPermit2.spender,
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
