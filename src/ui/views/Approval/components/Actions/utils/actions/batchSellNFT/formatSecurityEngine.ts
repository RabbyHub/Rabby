import { FormatSecurityEngineContext } from '../../types';

export const formatSecurityEngineBatchSellNFT: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'typed_data') {
    return {};
  }
  const { actionData, requireData, chainId, provider } = options;

  if (!actionData.batchSellNFT) {
    return {};
  }

  const receiveTokenIsFake =
    actionData.batchSellNFT.receive_token.is_verified === false;
  const receiveTokenIsScam = receiveTokenIsFake
    ? false
    : !!actionData.batchSellNFT.receive_token.is_suspicious;
  return {
    batchSellNFT: {
      specificBuyer: actionData.batchSellNFT.takers[0],
      from: actionData.sender,
      receiver: actionData.batchSellNFT.receiver,
      receiveTokenHasFake: receiveTokenIsFake,
      receiveTokenHasScam: receiveTokenIsScam,
      chainId,
      id: actionData.contractId,
    },
  };
};
