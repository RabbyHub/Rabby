import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

import {
  ApprovalItem,
  ApprovalSpenderItemToBeRevoked,
  ContractApprovalItem,
  NftApprovalItem,
  RiskNumMap,
  TokenApprovalItem,
  compareContractApprovalItemByRiskLevel,
} from '@/utils/approval';
import { SorterResult } from 'antd/lib/table/interface';
import { NFTApproval, Spender } from '@rabby-wallet/rabby-api/dist/types';
import { Chain } from '@debank/common';
import { openInTab } from '@/ui/utils';
import { findChainByServerID } from '@/utils/chain';

export function formatTimeFromNow(time?: Date | number) {
  if (!time) return '';

  const obj = dayjs(time);
  if (!obj.isValid()) return '';

  return dayjs(time).fromNow();
}

export function isRiskyContract(contract: ContractApprovalItem) {
  return ['danger', 'warning'].includes(contract.risk_level);
}

export function checkCompareContractItem(
  a: ContractApprovalItem,
  b: ContractApprovalItem,
  sortedInfo: SorterResult<ContractApprovalItem>,
  columnKey: string
) {
  const comparison = compareContractApprovalItemByRiskLevel(a, b);

  const isColumnAsc =
    sortedInfo.columnKey === columnKey && sortedInfo.order === 'ascend';

  return {
    comparison,
    shouldEarlyReturn: !!comparison,
    keepRiskFirstReturnValue: isColumnAsc ? -comparison : comparison,
  };
}

export function encodeRevokeItemIndex(approval: ApprovalItem) {
  return `${approval.chain}:${approval.id}`;
}

export const findIndexRevokeList = <
  T extends ApprovalItem['list'][number] = ApprovalItem['list'][number]
>(
  list: any[],
  item: ApprovalItem,
  token: T
) => {
  if (item.type === 'contract') {
    if ('inner_id' in token) {
      return list.findIndex((revoke) => {
        if (
          revoke.contractId === token.contract_id &&
          revoke.spender === token.spender.id &&
          revoke.tokenId === token.inner_id &&
          revoke.chainServerId === token.chain
        ) {
          return true;
        }
      });
    } else if ('contract_name' in token) {
      return list.findIndex((revoke) => {
        if (
          revoke.contractId === token.contract_id &&
          revoke.spender === token.spender.id &&
          revoke.chainServerId === token.chain
        ) {
          return true;
        }
      });
    } else {
      return list.findIndex((revoke) => {
        if (
          revoke.spender === item.id &&
          revoke.id === token.id &&
          revoke.chainServerId === item.chain
        ) {
          return true;
        }
      });
    }
  } else if (item.type === 'token') {
    return list.findIndex((revoke) => {
      if (
        revoke.spender === (token as Spender).id &&
        revoke.id === item.id &&
        revoke.chainServerId === item.chain
      ) {
        return true;
      }
    });
  } else if (item.type === 'nft') {
    return list.findIndex((revoke) => {
      const isNftContracts = !!item.nftContract;
      const nftInfo = isNftContracts ? item.nftContract : item.nftToken;

      if (
        revoke.spender === (token as Spender).id &&
        revoke.tokenId === (nftInfo as NFTApproval).inner_id &&
        revoke.chainServerId === item.chain
      ) {
        return true;
      }
    });
  }
  return -1;
};

export const toRevokeItem = <T extends ApprovalItem>(
  item: T,
  token: T['list'][number]
): ApprovalSpenderItemToBeRevoked | undefined => {
  if (item.type === 'contract') {
    if ('inner_id' in token) {
      const abi = token?.is_erc721
        ? 'ERC721'
        : token?.is_erc1155
        ? 'ERC1155'
        : '';
      return {
        chainServerId: token?.chain,
        contractId: token?.contract_id,
        spender: token?.spender?.id,
        abi,
        tokenId: token?.inner_id,
        isApprovedForAll: false,
      } as const;
    } else if ('contract_name' in token) {
      const abi = token?.is_erc721
        ? 'ERC721'
        : token?.is_erc1155
        ? 'ERC1155'
        : '';
      return {
        chainServerId: token?.chain,
        contractId: token?.contract_id,
        spender: token?.spender?.id,
        tokenId: null,
        abi,
        isApprovedForAll: true,
      } as const;
    } else {
      return {
        chainServerId: item.chain,
        id: token?.id,
        spender: item.id,
      };
    }
  }

  if (item.type === 'token') {
    return {
      chainServerId: item.chain,
      id: item.id,
      spender: (token as Spender).id,
    };
  }

  if (item.type === 'nft') {
    const isNftContracts = !!item.nftContract;
    const nftInfo = isNftContracts ? item.nftContract : item.nftToken;
    const abi = nftInfo?.is_erc721
      ? 'ERC721'
      : nftInfo?.is_erc1155
      ? 'ERC1155'
      : '';
    return {
      chainServerId: item?.chain,
      contractId: nftInfo?.contract_id || '',
      spender: (token as Spender).id,
      tokenId: (nftInfo as NFTApproval)?.inner_id || null,
      abi,
      isApprovedForAll: nftInfo && 'inner_id' in nftInfo ? false : true,
    };
  }

  return undefined;
};

export function getFinalRiskInfo(contract: ContractApprovalItem) {
  const eva = contract.$contractRiskEvaluation;
  const finalMaxScore = Math.max(eva.clientMaxRiskScore, eva.serverRiskScore);

  const isDanger = finalMaxScore >= RiskNumMap.danger;
  const isWarning = !isDanger && finalMaxScore >= RiskNumMap.warning;

  return { isDanger, isWarning };
}

export function openScanLinkFromChainItem(
  chainItem: Chain | null | undefined,
  address: string
) {
  if (!chainItem) return;

  openInTab(
    chainItem?.scanLink.replace(/tx\/_s_/, `address/${address}`),
    false
  );
}

export function maybeNFTLikeItem(
  contractListItem: ContractApprovalItem['list'][number]
) {
  return (
    'spender' in contractListItem &&
    (contractListItem.is_erc1155 || contractListItem.is_erc721)
  );
}
