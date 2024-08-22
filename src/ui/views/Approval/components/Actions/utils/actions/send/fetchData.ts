import PQueue from 'p-queue';
import { waitQueueFinished } from '../../utils/waitQueueFinished';
import { FetchActionRequiredData, SendRequireData } from '../../types';
import { KEYRING_TYPE } from '../../utils/keyring';

// send, sendNFT, typedData.send
export const fetchDataSend: FetchActionRequiredData<{
  to: string;
  token: { id: string; chain: string };
}> = async (options, likeSendAction) => {
  const queue = new PQueue();
  const { actionData, walletProvider, apiProvider, chainId, sender } = options;
  const sendAction = likeSendAction || actionData.send;

  if (!sendAction || !chainId) {
    return {};
  }

  const result: SendRequireData = {
    eoa: null,
    cex: null,
    contract: null,
    usd_value: 0,
    protocol: null,
    hasTransfer: false,
    usedChains: [],
    isTokenContract: false,
    name: null,
    onTransferWhitelist: false,
    whitelistEnable: false,
    receiverIsSpoofing: false,
    hasReceiverPrivateKeyInWallet: false,
    hasReceiverMnemonicInWallet: false,
  };
  const hasPrivateKeyInWallet = await walletProvider.hasPrivateKeyInWallet(
    sendAction.to
  );
  if (hasPrivateKeyInWallet) {
    result.hasReceiverPrivateKeyInWallet =
      hasPrivateKeyInWallet === KEYRING_TYPE.SimpleKeyring;
    result.hasReceiverMnemonicInWallet =
      hasPrivateKeyInWallet === KEYRING_TYPE.HdKeyring;
  }
  queue.add(async () => {
    const { has_transfer } = await apiProvider.hasTransfer(
      chainId,
      sender,
      sendAction.to
    );
    result.hasTransfer = has_transfer;
  });
  queue.add(async () => {
    const { desc } = await apiProvider.addrDesc(sendAction.to);
    if (desc.cex?.id) {
      result.cex = {
        id: desc.cex.id,
        logo: desc.cex.logo_url,
        name: desc.cex.name,
        bornAt: desc.born_at,
        isDeposit: desc.cex.is_deposit,
      };
    }
    if (desc.contract && Object.keys(desc.contract).length > 0) {
      result.contract = desc.contract;
    }
    if (!result.cex && !result.contract) {
      result.eoa = {
        id: sendAction.to,
        bornAt: desc.born_at,
      };
    }
    result.usd_value = desc.usd_value;
    if (result.cex) {
      const { support } = await apiProvider.depositCexSupport(
        sendAction.token.id,
        sendAction.token.chain,
        result.cex.id
      );
      result.cex.supportToken = support;
    }
    if (result.contract) {
      const { is_token } = await apiProvider.isTokenContract(
        chainId,
        sendAction.to
      );
      result.isTokenContract = is_token;
    }
    result.name = desc.name;
    if (walletProvider.ALIAS_ADDRESS[sendAction.to.toLowerCase()]) {
      result.name = walletProvider.ALIAS_ADDRESS[sendAction.to.toLowerCase()];
    }
  });
  queue.add(async () => {
    const usedChainList = await apiProvider.addrUsedChainList(sendAction.to);
    result.usedChains = usedChainList;
  });
  queue.add(async () => {
    const { is_spoofing } = await apiProvider.checkSpoofing({
      from: sender,
      to: sendAction.to,
    });
    result.receiverIsSpoofing = is_spoofing;
  });
  const whitelist = await walletProvider.getWhitelist();
  const whitelistEnable = await walletProvider.isWhitelistEnabled();
  result.whitelistEnable = whitelistEnable;
  result.onTransferWhitelist = whitelist.includes(sendAction.to.toLowerCase());
  await waitQueueFinished(queue);

  return result;
};
