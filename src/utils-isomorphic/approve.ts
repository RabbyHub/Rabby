import type { Spender, TokenApproval } from '@/background/service/openapi';
import type { ApprovalItem, NFTInfoHost } from '../utils/approval';
import { TokenSpenderPair } from '@/types/permit2';

export type ApprovalSpenderItemToBeRevoked = {
  chainServerId: ApprovalItem['chain'];
  spender: Spender['id'];
  permit2Id?: string;
} & (
  | {
      // hostType: ApprovalItem['type'] & 'nft',
      contractId: NFTInfoHost['contract_id'];
      abi: 'ERC721' | 'ERC1155' | '';
      isApprovedForAll: boolean;
      nftTokenId: string | null | undefined;
    }
  | {
      // hostType: ApprovalItem['type'] & ('contract' | 'token')
      id: TokenApproval['id'] | Spender['id'];
      tokenId: string | null | undefined;
    }
);

export type RevokeSummary = {
  generalRevokes: ApprovalSpenderItemToBeRevoked[];
  permit2Revokes: {
    [permit2Id: string]: {
      contractId: string;
      permit2Id: string;
      chainServerId: string;
      // if length > 0, batch revoke
      tokenSpenders: TokenSpenderPair[];
    };
  };
  statics: {
    txCount: number;
  };
};

export function summarizeRevoke(revokeList: ApprovalSpenderItemToBeRevoked[]) {
  const { statics, permit2Revokes, generalRevokes } = revokeList.reduce(
    (accu, cur) => {
      if ('permit2Id' in cur && cur.permit2Id) {
        const permit2Id = cur.permit2Id;
        if (!accu.permit2Revokes[permit2Id]) {
          accu.permit2Revokes[permit2Id] = accu.permit2Revokes[permit2Id] || {
            chainServerId: cur.chainServerId,
            // contractId: cur.contractId,
            permit2Id,
            tokenSpenders: [],
          };
        }

        if ('tokenId' in cur && cur.tokenId) {
          accu.permit2Revokes[permit2Id].tokenSpenders.push({
            spender: cur.spender,
            token: cur.tokenId,
          });
        }
        // accu.permit2Revokes[permit2Id].push(cur);
      } else {
        accu.generalRevokes.push(cur);
      }

      return accu;
    },
    <RevokeSummary>{
      generalRevokes: [],
      permit2Revokes: {},
      statics: {
        txCount: 0,
      },
    }
  );

  statics.txCount =
    generalRevokes.length +
    Object.values(permit2Revokes).filter(
      (revokes) => revokes.tokenSpenders.length > 0
    ).length;

  return {
    // $originalList: revokeList,
    statics,
    generalRevokes,
    permit2Revokes,
  };
}
