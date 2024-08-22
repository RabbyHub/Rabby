import { FormatSecurityEngineContext } from '../../types';

export const formatSecurityEngineSellNFT: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'typed_data') {
    return {};
  }
  const { actionData, requireData, chainId, provider } = options;

  if (!actionData.sellNFT) {
    return {};
  }

  const receiveTokenIsFake =
    actionData.sellNFT.receive_token.is_verified === false;
  const receiveTokenIsScam = receiveTokenIsFake
    ? false
    : !!actionData.sellNFT.receive_token.is_suspicious;
  return {
    sellNFT: {
      specificBuyer: actionData.sellNFT.takers[0],
      from: actionData.sender,
      receiver: actionData.sellNFT.receiver,
      receiveTokenIsFake,
      receiveTokenIsScam,
      chainId: chainId,
      id: actionData.contractId,
    },
  };
};
