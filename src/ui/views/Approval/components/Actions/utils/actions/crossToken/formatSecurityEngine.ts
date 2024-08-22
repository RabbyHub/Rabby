import { FormatSecurityEngineContext, SwapRequireData } from '../../types';

export const formatSecurityEngineCrossToken: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'transaction') {
    return {};
  }
  const { actionData, requireData, chainId, provider } = options;

  if (!actionData.crossToken) {
    return {};
  }
  const data = requireData as SwapRequireData;
  const {
    receiver,
    receiveToken,
    usdValuePercentage,
    usdValueDiff,
  } = actionData.crossToken;
  const { sender } = data;
  const receiveTokenIsFake = receiveToken.is_verified === false;
  const receiveTokenIsScam = receiveTokenIsFake
    ? false
    : !!receiveToken.is_suspicious;
  return {
    crossToken: {
      receiveTokenIsScam,
      receiveTokenIsFake,
      receiver,
      from: sender,
      id: data.id,
      chainId,
      usdValuePercentage,
      usdValueChange: Number(usdValueDiff),
      receiverInWallet: data.receiverInWallet,
    },
  };
};
