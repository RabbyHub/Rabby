import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';

dayjs.extend(relativeTime);
dayjs.extend(updateLocale);

import {
  ApprovalItem,
  ContractApprovalItem,
  RiskNumMap,
  SpenderInTokenApproval,
  compareContractApprovalItemByRiskLevel,
} from '@/utils/approval';
import { ApprovalSpenderItemToBeRevoked } from '@/utils-isomorphic/approve';
import { SorterResult } from 'antd/lib/table/interface';
import {
  NFTApproval,
  NFTApprovalContract,
  Spender,
} from '@rabby-wallet/rabby-api/dist/types';
import { Chain } from '@debank/common';
import { getUiType, openInTab } from '@/ui/utils';
import { getAddressScanLink } from '@/utils';

export function formatTimeFromNow(time?: Date | number) {
  if (!time) return '';

  const obj = dayjs(time);
  if (!obj.isValid()) return '';

  dayjs.updateLocale('en', {
    relativeTime: {
      future: 'in %s',
      past: '%s ago',
      s: 'a few seconds',
      m: '1 minute',
      mm: '%d minutes',
      h: '1 hour',
      hh: '%d hours',
      d: '1 day',
      dd: '%d days',
      M: '1 month',
      MM: '%d months',
      y: '1 year',
      yy: '%d years',
    },
  });

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

export function getFirstSpender(spenderHost: ApprovalItem['list'][number]) {
  if ('spender' in spenderHost) return spenderHost.spender;

  if ('spenders' in spenderHost) return spenderHost.spenders[0];

  return undefined;
}

/**
 * @description spenderHost should from `contract.list[number]`
 * @param spenderHost
 * @param contract
 * @returns
 */
export function findContractMatchedSpender(
  spenderHost: ApprovalItem['list'][number],
  contract: ContractApprovalItem
) {
  let spenderItem: Spender | undefined = undefined;
  if ('spenders' in spenderHost) {
    spenderItem = spenderHost.spenders.find(
      (spender: SpenderInTokenApproval) =>
        spender.$assetContract && spender.$assetContract?.id == contract.id
    );
  }

  return spenderItem;
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
          (!revoke.permit2Id ||
            revoke.permit2Id ===
              findContractMatchedSpender(token, item)?.permit2_id) &&
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
          (!revoke.permit2Id ||
            revoke.permit2Id ===
              findContractMatchedSpender(token, item)?.permit2_id) &&
          revoke.chainServerId === token.chain
        ) {
          return true;
        }
      });
    } else {
      return list.findIndex((revoke) => {
        if (
          revoke.spender === item.id &&
          (!revoke.permit2Id ||
            revoke.permit2Id ===
              findContractMatchedSpender(token, item)?.permit2_id) &&
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
        // hostType: 'contract',
        chainServerId: token?.chain,
        contractId: token?.contract_id,
        permit2Id: findContractMatchedSpender(token, item)?.permit2_id,
        spender: token?.spender?.id,
        abi,
        nftTokenId: token?.inner_id,
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
        permit2Id: findContractMatchedSpender(token, item)?.permit2_id,
        spender: token?.spender?.id,
        nftTokenId: null,
        abi,
        isApprovedForAll: true,
      } as const;
    } else {
      return {
        chainServerId: item.chain,
        permit2Id: findContractMatchedSpender(token, item)?.permit2_id,
        tokenId: token?.id,
        id: token?.id,
        spender: item.id,
      };
    }
  }

  if (item.type === 'token') {
    return {
      chainServerId: item.chain,
      tokenId: (token as Spender).id,
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
      // hostType: item.type,
      chainServerId: item?.chain,
      contractId: nftInfo?.contract_id || '',
      spender: (token as Spender).id,
      nftTokenId: (nftInfo as NFTApproval)?.inner_id || null,
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

  return {
    isServerRisk: eva.serverRiskScore >= RiskNumMap.warning,
    // isServerDanger: eva.serverRiskScore >= RiskNumMap.danger,
    // isServerWarning: eva.serverRiskScore >= RiskNumMap.warning,
    isDanger,
    isWarning,
  };
}

export function openScanLinkFromChainItem(
  scanLink: Chain['scanLink'] | null | undefined,
  address: string,
  needClose = false
) {
  if (!scanLink) return;

  openInTab(getAddressScanLink(scanLink, address), needClose);
}

const isTab = getUiType().isTab;
export function openNFTLinkFromChainItem(
  chainOrScanLink: Chain | Chain['scanLink'] | null | undefined,
  address: string,
  needClose = !isTab
) {
  const scanLink =
    typeof chainOrScanLink === 'string'
      ? chainOrScanLink
      : chainOrScanLink?.scanLink;
  return openScanLinkFromChainItem(scanLink, address, needClose);
}

export function maybeNFTLikeItem(
  contractListItem: ContractApprovalItem['list'][number]
): contractListItem is NFTApproval | NFTApprovalContract {
  return (
    'spender' in contractListItem &&
    (contractListItem.is_erc1155 || contractListItem.is_erc721)
  );
}
