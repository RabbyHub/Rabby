import { FormatSecurityEngineContext } from '../../types';

export const formatSecurityEngineSwapTokenOrder: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'typed_data') {
    return {};
  }
  const { actionData, requireData, chainId, provider } = options;

  if (!actionData.swapTokenOrder) {
    return {};
  }

  const receiverInWallet = await provider.hasAddress(
    actionData.swapTokenOrder.receiver
  );
  const receiveTokenIsFake =
    actionData.swapTokenOrder.receiveToken.is_verified === false;
  const receiveTokenIsScam = receiveTokenIsFake
    ? false
    : !!actionData.swapTokenOrder.receiveToken.is_suspicious;
  return {
    swapTokenOrder: {
      receiveTokenIsFake,
      receiveTokenIsScam,
      receiver: actionData.swapTokenOrder.receiver,
      from: actionData.sender,
      usdValuePercentage: actionData.swapTokenOrder.usdValuePercentage,
      chainId,
      id: actionData.contractId,
      receiverInWallet,
    },
  };
};
