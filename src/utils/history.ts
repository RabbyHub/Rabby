import { TxHistoryItemRow } from '@/db/schema/history';
import {
  NFTItem,
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

export const judgeIsSmallUsdTx = (item: TxHistoryItemRow) => {
  if (item.tx?.from_addr.toLowerCase() === item.owner_addr.toLowerCase()) {
    return false;
  }

  const receives = item.receives;

  if (!receives || !receives.length) {
    return true;
  }
  let allUsd = 0;

  for (const i of receives) {
    const token = i.token;
    const tokenIsNft = i.token_id?.length === 32;
    if (tokenIsNft) {
      // reeives nft
      const nftToken = (token as unknown) as NFTItem;
      if (!nftToken || !nftToken.collection) {
        return true;
      } else {
        return false;
      }
    }
    const isCore = token?.is_core || token?.is_verified;
    const price = isCore ? token?.price || token?.price || 0 : 0; // is not core token price to 0
    const usd = i.amount * price;
    allUsd += usd;
  }

  if (allUsd < 0.1) {
    return true;
  }

  return false;
};

export const transformToHistory = ({
  data,
  address,
}: {
  data: TxHistoryResult | TxAllHistoryResult;
  address?: string;
}) => {
  const owner = address?.toLowerCase() || '';
  return data.history_list.map((item) => {
    const res = {
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
          token: getTokenFromDict({
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
          token: getTokenFromDict({
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
      is_small_tx: false,
    };

    res.is_small_tx = judgeIsSmallUsdTx(res);

    return res;
  });
};
