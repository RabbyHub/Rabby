import { WrapTokenRequireData } from '../../types';
import { FormatSecurityEngineContext } from '../../types';

export const formatSecurityEngineWrapToken: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'transaction') {
    return {};
  }
  const { actionData, requireData, chainId, provider } = options;

  if (!actionData.wrapToken || !chainId) {
    return {};
  }
  const { slippageTolerance, receiver } = actionData.wrapToken;
  const data = requireData as WrapTokenRequireData;
  return {
    wrapToken: {
      slippageTolerance,
      receiver,
      from: data.sender,
      chainId,
      id: data.id,
      receiverInWallet: data.receiverInWallet,
    },
    contractCall: {
      id: data.id,
      chainId,
    },
  };
};
