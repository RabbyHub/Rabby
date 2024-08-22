import PQueue from 'p-queue';
import { ApproveNFTRequireData, FetchActionRequiredData } from '../../types';
import { waitQueueFinished } from '../../utils/waitQueueFinished';

export const fetchDataApproveNFT: FetchActionRequiredData<{
  spender: string;
}> = async (options, likeAction) => {
  if (options.type !== 'transaction') {
    return {};
  }
  const queue = new PQueue();
  const { sender, apiProvider, chainId, actionData } = options;
  const action = likeAction || actionData.approveNFT;

  if (!action) {
    return {};
  }

  const result: ApproveNFTRequireData = {
    isEOA: false,
    contract: null,
    riskExposure: 0,
    rank: null,
    hasInteraction: false,
    bornAt: 0,
    protocol: null,
    isDanger: false,
    tokenBalance: '0',
  };

  queue.add(async () => {
    const contractInfo = await apiProvider.getContractInfo(
      action.spender,
      chainId
    );
    if (!contractInfo) {
      result.isEOA = true;
      result.rank = null;
    } else {
      result.rank = contractInfo.credit.rank_at;
      result.riskExposure = contractInfo.top_nft_spend_usd_value;
      result.bornAt = contractInfo.create_at;
      result.isDanger =
        contractInfo.is_danger.auto || contractInfo.is_danger.edit;
      result.protocol = contractInfo.protocol;
    }
  });
  if (result.isEOA) {
    queue.add(async () => {
      const { desc } = await apiProvider.addrDesc(action.spender);
      result.bornAt = desc.born_at;
    });
  }
  queue.add(async () => {
    const hasInteraction = await apiProvider.hasInteraction(
      sender,
      chainId,
      action.spender
    );
    result.hasInteraction = hasInteraction.has_interaction;
  });
  await waitQueueFinished(queue);
  return result;
};
