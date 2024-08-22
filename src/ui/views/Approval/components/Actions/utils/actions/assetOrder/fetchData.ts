import PQueue from 'p-queue';
import {
  AssetOrderRequireData,
  ContractRequireData,
  FetchActionRequiredData,
  ReceiverData,
} from '../../types';
import { waitQueueFinished } from '../../utils/waitQueueFinished';

export const fetchDataAssetOrder: FetchActionRequiredData<{
  receiver: string;
}> = async (options, likeAction) => {
  const { walletProvider, actionData, sender, apiProvider, chainId } = options;
  const queue = new PQueue();
  let action = likeAction;

  if (options.type === 'transaction') {
    action = {
      receiver: options.tx.to,
    };
  }

  if (!action || !chainId) {
    return {};
  }
  const { receiver } = action;

  const result: ContractRequireData = {
    id: receiver,
    protocol: null,
    bornAt: 0,
    hasInteraction: false,
    rank: null,
    unexpectedAddr: null,
    receiverInWallet: false,
  };

  if (options.type === 'typed_data') {
    (result as AssetOrderRequireData).sender = sender;
  }

  let isEOA = false;
  queue.add(async () => {
    const contractInfo = await apiProvider.getContractInfo(receiver, chainId);
    if (!contractInfo) {
      result.rank = null;
      isEOA = true;
    } else {
      result.rank = contractInfo.credit.rank_at;
      result.bornAt = contractInfo.create_at;
      result.protocol = contractInfo.protocol;
    }
  });

  if (isEOA) {
    queue.add(async () => {
      const { desc } = await apiProvider.addrDesc(receiver);
      result.bornAt = desc.born_at;
    });
  }
  queue.add(async () => {
    const hasInteraction = await apiProvider.hasInteraction(
      sender,
      chainId,
      receiver
    );
    result.hasInteraction = hasInteraction.has_interaction;
  });

  if (actionData.contractCall || actionData.common) {
    const chain = walletProvider.findChain({
      serverId: chainId,
    });

    queue.add(async () => {
      const addr = actionData.common?.receiver;

      if (addr) {
        result.receiverInWallet = await walletProvider.hasAddress(addr);
        const receiverData: ReceiverData = {
          address: addr,
          chain: chain!,
          eoa: null,
          cex: null,
          contract: null,
          usd_value: 0,
          hasTransfer: false,
          isTokenContract: false,
          name: null,
          onTransferWhitelist: false,
        };

        const { has_transfer } = await apiProvider.hasTransfer(
          chainId,
          sender,
          addr
        );
        receiverData.hasTransfer = has_transfer;

        const { desc } = await apiProvider.addrDesc(addr);
        if (desc.cex?.id) {
          receiverData.cex = {
            id: desc.cex.id,
            logo: desc.cex.logo_url,
            name: desc.cex.name,
            bornAt: desc.born_at,
            isDeposit: desc.cex.is_deposit,
          };
        }
        if (desc.contract && Object.keys(desc.contract).length > 0) {
          receiverData.contract = desc.contract;
        }
        if (!receiverData.cex && !receiverData.contract) {
          receiverData.eoa = {
            id: addr,
            bornAt: desc.born_at,
          };
        }
        receiverData.usd_value = desc.usd_value;
        if (receiver) {
          const { is_token } = await apiProvider.isTokenContract(chainId, addr);
          receiverData.isTokenContract = is_token;
        }
        receiverData.name = desc.name;
        if (walletProvider.ALIAS_ADDRESS[addr.toLowerCase()]) {
          receiverData.name = walletProvider.ALIAS_ADDRESS[addr.toLowerCase()];
        }

        const whitelist = await walletProvider.getWhitelist();
        receiverData.onTransferWhitelist = whitelist.includes(
          addr.toLowerCase()
        );
        result.unexpectedAddr = receiverData;
      }
    });
  }
  await waitQueueFinished(queue);
  return result;
};
