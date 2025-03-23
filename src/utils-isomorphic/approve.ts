import type { Spender, TokenApproval } from '@/background/service/openapi';
import type { ApprovalItem, NFTInfoHost } from '../utils/approval';
import { TokenSpenderPair } from '@/types/permit2';
import { obj2query, query2obj } from '@/ui/utils/url';

export type ApprovalSpenderItemToBeRevoked = {
  chainServerId: ApprovalItem['chain'];
  approvalType: ApprovalItem['type'];
  spender: Spender['id'];
  permit2Id?: string;
} & (
  | {
      contractId: NFTInfoHost['contract_id'];
      isApprovedForAll: boolean;
      tokenId?: '';
      abi: 'ERC721' | 'ERC1155' | '';
      nftTokenId: string | null | undefined;
      nftContractName?: string | null | undefined;
    }
  | {
      contractId?: undefined;
      id: TokenApproval['id'] | Spender['id'];
      tokenId?: string | null | undefined;
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
    spenderCount: number;
  };
};

export function encodePermit2GroupKey(
  chainServerId: string,
  permit2ContractId: string
) {
  return obj2query({ chainServerId, permit2ContractId });
}

export function decodePermit2GroupKey(key: string) {
  const { chainServerId, permit2ContractId } = (query2obj(key) || {}) as {
    chainServerId?: string;
    permit2ContractId?: string;
  };
  return { chainServerId, permit2ContractId };
}

export function summarizeRevoke(revokeList: ApprovalSpenderItemToBeRevoked[]) {
  const { statics, permit2Revokes, generalRevokes } = revokeList.reduce(
    (accu, cur) => {
      accu.statics.spenderCount += 1;
      if ('permit2Id' in cur && cur.permit2Id) {
        const permit2Id = cur.permit2Id;
        const permit2Key = encodePermit2GroupKey(cur.chainServerId, permit2Id);
        if (!accu.permit2Revokes[permit2Key]) {
          accu.permit2Revokes[permit2Key] = accu.permit2Revokes[permit2Key] || {
            chainServerId: cur.chainServerId,
            // contractId: cur.contractId,
            permit2Id,
            tokenSpenders: [],
          };
        }

        if ('tokenId' in cur && cur.tokenId) {
          accu.permit2Revokes[permit2Key].tokenSpenders.push({
            spender: cur.spender,
            token: cur.tokenId,
          });
        }
        // accu.permit2Revokes[permit2Key].push(cur);
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
        spenderCount: 0,
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
