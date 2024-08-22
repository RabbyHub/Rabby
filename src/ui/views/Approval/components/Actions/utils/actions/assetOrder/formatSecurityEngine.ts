import {
  AssetOrderRequireData,
  FormatSecurityEngineContext,
} from '../../types';

export const formatSecurityEngineAssetOrder: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'transaction' && options.type !== 'typed_data') {
    return {};
  }
  const { actionData, requireData, chainId, provider } = options;

  if (!actionData.assetOrder) {
    return {};
  }
  const {
    takers,
    receiver,
    receiveNFTList,
    receiveTokenList,
  } = actionData.assetOrder;
  const data = requireData as AssetOrderRequireData;
  return {
    assetOrder: {
      specificBuyer: takers[0],
      from: data.sender,
      receiver: receiver || '',
      chainId,
      id: data.id,
      hasReceiveAssets: receiveNFTList.length + receiveTokenList.length > 0,
    },
  };
};
