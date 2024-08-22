import PQueue from 'p-queue';
import {
  ApproveTokenRequireData,
  FetchActionRequiredData,
  ParsedActionData,
} from '../../types';
import { ApproveAction } from '@rabby-wallet/rabby-api/dist/types';
import { waitQueueFinished } from '../../utils/waitQueueFinished';

export const fetchDataApproveToken: FetchActionRequiredData<{
  spender: ApproveAction['spender'];
  token?: ApproveAction['token'];
}> = async (options, likeAction) => {
  const queue = new PQueue();
  const { sender, apiProvider, chainId, actionData } = options;
  const action =
    likeAction || (<ParsedActionData<'transaction'>>actionData).approveToken;

  if (!action || !chainId) {
    return {};
  }

  const { spender, token } = action;
  const result: ApproveTokenRequireData = {
    isEOA: false,
    contract: null,
    riskExposure: 0,
    rank: null,
    hasInteraction: false,
    bornAt: 0,
    protocol: null,
    isDanger: false,
    token: {
      ...token,
      amount: 0,
      raw_amount_hex_str: '0x0',
    } as any,
  };
  queue.add(async () => {
    const contractInfo = await apiProvider.getContractInfo(spender, chainId);
    if (!contractInfo) {
      result.isEOA = true;
      result.rank = null;
    } else {
      result.rank = contractInfo.credit.rank_at;
      result.riskExposure = contractInfo.spend_usd_value;
      result.bornAt = contractInfo.create_at;
      result.isDanger =
        contractInfo.is_danger.auto || contractInfo.is_danger.edit;
      result.protocol = contractInfo.protocol;
    }
  });
  if (token) {
    queue.add(async () => {
      const t = await apiProvider.getToken(sender, chainId, token.id);
      result.token = t;
    });
  }
  if (result.isEOA) {
    queue.add(async () => {
      const { desc } = await apiProvider.addrDesc(spender);
      result.bornAt = desc.born_at;
    });
  }
  queue.add(async () => {
    const hasInteraction = await apiProvider.hasInteraction(
      sender,
      chainId,
      spender
    );
    result.hasInteraction = hasInteraction.has_interaction;
  });
  await waitQueueFinished(queue);
  return result;
};
