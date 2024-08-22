import PQueue from 'p-queue';
import {
  ContractCallRequireData,
  FetchActionRequiredData,
  ReceiverData,
} from '../../types';
import { getProtocol } from '../../utils/getProtocol';
import { waitQueueFinished } from '../../utils/waitQueueFinished';

export const fetchDataContractCall: FetchActionRequiredData = async (
  options
) => {
  if (options.type !== 'transaction') {
    return {};
  }
  const queue = new PQueue();
  const {
    contractCall,
    walletProvider,
    actionData,
    sender,
    apiProvider,
    chainId,
    tx,
  } = options;

  if (!(actionData.contractCall || actionData.common) || !contractCall) {
    return {};
  }

  const chain = walletProvider.findChain({
    serverId: chainId,
  });
  const result: ContractCallRequireData = {
    contract: null,
    rank: null,
    hasInteraction: false,
    bornAt: 0,
    protocol: null,
    call: contractCall!,
    id: contractCall!.contract.id,
    payNativeTokenAmount: tx.value || '0x0',
    nativeTokenSymbol: chain?.nativeTokenSymbol || 'ETH',
    unexpectedAddr: null,
    receiverInWallet: false,
  };
  queue.add(async () => {
    const contractInfo = await apiProvider.getContractInfo(
      contractCall!.contract.id,
      chainId
    );
    if (!contractInfo) {
      result.rank = null;
    } else {
      result.rank = contractInfo.credit.rank_at;
    }
  });
  queue.add(async () => {
    const { desc } = await apiProvider.addrDesc(contractCall!.contract.id);
    if (desc.contract) {
      result.contract = desc.contract;
      if (desc.contract[chainId]) {
        result.bornAt = desc.contract[chainId].create_at;
      }
    }
    result.protocol = getProtocol(desc.protocol, chainId);
  });
  queue.add(async () => {
    const hasInteraction = await apiProvider.hasInteraction(
      sender,
      chainId,
      contractCall!.contract.id
    );
    result.hasInteraction = hasInteraction.has_interaction;
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
      if (result.contract) {
        const { is_token } = await apiProvider.isTokenContract(chainId, addr);
        receiverData.isTokenContract = is_token;
      }
      receiverData.name = desc.name;
      if (walletProvider.ALIAS_ADDRESS[addr.toLowerCase()]) {
        receiverData.name = walletProvider.ALIAS_ADDRESS[addr.toLowerCase()];
      }

      const whitelist = await walletProvider.getWhitelist();
      receiverData.onTransferWhitelist = whitelist.includes(addr.toLowerCase());
      result.unexpectedAddr = receiverData;
    }
  });
  await waitQueueFinished(queue);
  return result;
};
