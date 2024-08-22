import { FormatSecurityEngineContext } from '../../types';

export const formatSecurityEngineBuyNFT: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'typed_data') {
    return {};
  }
  const { actionData, requireData, chainId, provider } = options;

  if (!actionData.buyNFT) {
    return {};
  }

  const receiveNFTIsFake =
    actionData.buyNFT.receive_nft.collection?.is_verified === false;
  const receiveNFTIsScam = receiveNFTIsFake
    ? false
    : !!actionData.buyNFT.receive_nft.collection?.is_suspicious;
  return {
    buyNFT: {
      from: actionData.sender,
      receiver: actionData.buyNFT.receiver,
      receiveNFTIsFake,
      receiveNFTIsScam,
      chainId,
      id: actionData.contractId,
    },
  };
};
