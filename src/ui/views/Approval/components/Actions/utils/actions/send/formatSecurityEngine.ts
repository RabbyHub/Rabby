import { SendRequireData } from '../../types';
import { FormatSecurityEngineContext } from '../../types';

export const formatSecurityEngineSend: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'transaction' && options.type !== 'typed_data') {
    return {};
  }
  const { actionData, requireData, chainId, provider } = options;

  if (!actionData.send || !chainId) {
    return {};
  }
  const data = requireData as SendRequireData;
  const { to } = actionData.send;

  return {
    send: {
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
      isTokenContract: data.isTokenContract,
      onTransferWhitelist: data.whitelistEnable
        ? data.onTransferWhitelist
        : false,
      receiverIsSpoofing: data.receiverIsSpoofing,
      hasReceiverMnemonicInWallet: data.hasReceiverMnemonicInWallet,
      hasReceiverPrivateKeyInWallet: data.hasReceiverPrivateKeyInWallet,
    },
  };
};
