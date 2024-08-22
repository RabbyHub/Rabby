import { WrapTokenRequireData } from '../../types';
import { FormatSecurityEngineContext } from '../../types';

export const formatSecurityEngineUnwrapToken: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'transaction') {
    return {};
  }
  const { actionData, requireData, chainId, provider } = options;

  if (!actionData.unWrapToken || !chainId) {
    return {};
  }
  const { slippageTolerance, receiver } = actionData.unWrapToken;
  const data = requireData as WrapTokenRequireData;
  return {
    unwrapToken: {
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
