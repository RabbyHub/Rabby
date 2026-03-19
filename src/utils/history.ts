import {
  TokenItem,
  TxAllHistoryResult,
  TxHistoryResult,
} from '@rabby-wallet/rabby-api/dist/types';

export const getTokenFromDict = ({
  tokenDict,
  tokenId,
  chain,
}: {
  tokenId: string;
  chain: string;
  tokenDict: Record<string, TokenItem>;
}) => {
  const tokenUUID = `${chain}_token:${tokenId}`;
  // TODO: {} is a temporary fix, need to make one real TokenItem object
  return tokenDict[tokenUUID] || tokenDict[tokenId] || ({} as TokenItem);
};

export const transformToHistory = ({
  data,
  address,
}: {
  data: TxHistoryResult | TxAllHistoryResult;
  address?: string;
}) => {
  const owner = address?.toLowerCase() || '';
  return data.history_list.map((item) => ({
    ...item,
    _id: `${owner}-${item.chain}-${item.id}`,
    _updated_at: Date.now(),
    owner_addr: owner,
    project_item: item.project_id
      ? data.project_dict[item.project_id]
      : undefined,
    receives: item.receives.map((token) => {
      return {
        ...token,
        ...getTokenFromDict({
          tokenId: token.token_id,
          chain: item.chain,
          tokenDict:
            'token_dict' in data ? data.token_dict : data.token_uuid_dict,
        }),
      };
    }),
    sends: item.sends.map((token) => {
      return {
        ...token,
        ...getTokenFromDict({
          tokenId: token.token_id,
          chain: item.chain,
          tokenDict:
            'token_dict' in data ? data.token_dict : data.token_uuid_dict,
        }),
      };
    }),
    approve_token: item.token_approve
      ? {
          ...getTokenFromDict({
            tokenId: item.token_approve.token_id,
            chain: item.chain,
            tokenDict:
              'token_dict' in data ? data.token_dict : data.token_uuid_dict,
          }),
        }
      : undefined,
    cate_item: item.cate_id ? data.cate_dict[item.cate_id] : undefined,
  }));
};
