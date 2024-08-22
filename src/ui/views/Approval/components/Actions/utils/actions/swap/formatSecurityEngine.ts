import { SwapRequireData } from '../../types';
import { FormatSecurityEngineContext } from '../../types';

export const formatSecurityEngineSwap: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'transaction') {
    return {};
  }
  const { actionData, requireData, chainId, provider } = options;

  if (!actionData.swap || !chainId) {
    return {};
  }
  const data = requireData as SwapRequireData;
  const {
    receiver,
    receiveToken,
    slippageTolerance,
    usdValuePercentage,
  } = actionData.swap;
  const { sender, id } = data;
  const receiveTokenIsFake = receiveToken.is_verified === false;
  const receiveTokenIsScam = receiveTokenIsFake
    ? false
    : !!receiveToken.is_suspicious;
  return {
    swap: {
      receiveTokenIsScam,
      receiveTokenIsFake,
      receiver,
      from: sender,
      chainId,
      id: data.id,
      contractAddress: id,
      slippageTolerance,
      usdValuePercentage,
      receiverInWallet: data.receiverInWallet,
    },
  };
};
