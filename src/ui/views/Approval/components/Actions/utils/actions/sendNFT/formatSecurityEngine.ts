import { SendRequireData } from '../../types';
import { FormatSecurityEngineContext } from '../../types';

export const formatSecurityEngineSendNFT: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'transaction') {
    return {};
  }
  const { actionData, requireData, chainId, provider } = options;

  if (!actionData.sendNFT || !chainId) {
    return {};
  }
  const data = requireData as SendRequireData;
  const { to } = actionData.sendNFT;

  return {
    sendNFT: {
      to,
      contract: data.contract
        ? {
            chains: Object.keys(data.contract),
          }
        : null,
      cex: data.cex
        ? {
            id: data.cex.id,
            isDeposit: data.cex.isDeposit,
            supportToken: data.cex.supportToken,
          }
        : null,
      hasTransfer: data.hasTransfer,
      chainId,
      usedChainList: data.usedChains.map((item) => item.id),
      onTransferWhitelist: data.whitelistEnable
        ? data.onTransferWhitelist
        : false,
      receiverIsSpoofing: data.receiverIsSpoofing,
      hasReceiverMnemonicInWallet: data.hasReceiverMnemonicInWallet,
      hasReceiverPrivateKeyInWallet: data.hasReceiverPrivateKeyInWallet,
    },
  };
};
