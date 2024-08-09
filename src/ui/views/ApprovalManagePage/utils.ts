import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';

dayjs.extend(relativeTime);
dayjs.extend(updateLocale);

import {
  ApprovalItem,
  AssetApprovalSpender,
  ContractApprovalItem,
  RiskNumMap,
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
import { obj2query, query2obj } from '@/ui/utils/url';

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

type SpendersHost = ApprovalItem['list'][number];
function getAbiType<T extends SpendersHost = ApprovalItem['list'][number]>(
  spenderHost: T
) {
  if ('is_erc721' in spenderHost && spenderHost.is_erc721) return 'ERC721';
  if ('is_erc1155' in spenderHost && spenderHost.is_erc1155) return 'ERC1155';

  return '';
}
export const findIndexRevokeList = <
  T extends SpendersHost = ApprovalItem['list'][number]
>(
  list: ApprovalSpenderItemToBeRevoked[],
  input: {
    spenderHost: T;
  } & (
    | {
        item: ContractApprovalItem;
        itemIsContractApproval?: true;
      }
    | {
        item: Exclude<ApprovalItem, ContractApprovalItem>;
        assetApprovalSpender?: AssetApprovalSpender;
      }
  )
) => {
  const { item, spenderHost } = input;

  if (item.type === 'contract') {
    let assetApprovalSpender =
      'assetApprovalSpender' in input
        ? input.assetApprovalSpender ?? null
        : null;
    const itemIsContractApproval =
      'itemIsContractApproval' in input ? input.itemIsContractApproval : false;
    if (itemIsContractApproval && '$indexderSpender' in spenderHost) {
      assetApprovalSpender = spenderHost.$indexderSpender ?? null;
    }
    const permit2IdToMatch = assetApprovalSpender?.permit2_id;

    if ('inner_id' in spenderHost) {
      return list.findIndex((revoke) => {
        if (
          revoke.contractId === spenderHost.contract_id &&
          revoke.spender === spenderHost.spender.id &&
          revoke.abi === getAbiType(spenderHost) &&
          (permit2IdToMatch
            ? revoke.permit2Id === permit2IdToMatch
            : !revoke.permit2Id) &&
          revoke.nftTokenId === spenderHost.inner_id &&
          revoke.chainServerId === spenderHost.chain
        ) {
          return true;
        }
      });
    } else if ('contract_name' in spenderHost) {
      return list.findIndex((revoke) => {
        if (
          revoke.contractId === spenderHost.contract_id &&
          revoke.spender === spenderHost.spender.id &&
          revoke.abi === getAbiType(spenderHost) &&
          revoke.nftContractName === spenderHost.contract_name &&
          (permit2IdToMatch
            ? revoke.permit2Id === permit2IdToMatch
            : !revoke.permit2Id) &&
          revoke.chainServerId === spenderHost.chain
        ) {
          return true;
        }
      });
    } else {
      return list.findIndex((revoke) => {
        if (
          revoke.spender === item.id &&
          (permit2IdToMatch
            ? revoke.permit2Id === permit2IdToMatch
            : !revoke.permit2Id) &&
          revoke.tokenId === spenderHost.id &&
          revoke.chainServerId === item.chain
        ) {
          return true;
        }
      });
    }
  } else if (item.type === 'token') {
    return list.findIndex((revoke) => {
      if (
        revoke.spender === (spenderHost as Spender).id &&
        // revoke.id === item.id &&
        revoke.tokenId === item.id &&
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
        revoke.spender === (spenderHost as Spender).id &&
        revoke.tokenId === (nftInfo as NFTApproval).inner_id &&
        revoke.chainServerId === item.chain
      ) {
        return true;
      }
    });
  }
  return -1;
};

export function isSameRevokeItem(
  src: ApprovalSpenderItemToBeRevoked,
  target: ApprovalSpenderItemToBeRevoked
) {
  const base =
    src.approvalType === target.approvalType &&
    src.contractId === target.contractId &&
    src.spender === target.spender &&
    src.permit2Id === target.permit2Id &&
    src.spender === target.spender;

  if (!base) return false;

  if ('id' in src && 'id' in target) {
    return src.id === target.id && src.tokenId === target.tokenId;
  } else if ('nftTokenId' in src && 'nftTokenId' in target) {
    return (
      src.contractId === target.contractId &&
      src.isApprovedForAll === target.isApprovedForAll &&
      src.tokenId === target.tokenId &&
      src.abi === target.abi &&
      src.nftTokenId === target.nftTokenId &&
      src.nftContractName === target.nftContractName
    );
  }
}

export function encodeRevokeItem(item: ApprovalSpenderItemToBeRevoked) {
  return `revoke-item://?${obj2query(item as any)}`;
}

export function decodeRevokeItem(key: string) {
  const [, query] = key.split('?');
  const obj = (query2obj(query) as any) as ApprovalSpenderItemToBeRevoked;

  for (const objKey in obj) {
    if (obj[objKey] === 'null') {
      obj[objKey] = null;
    } else if (obj[objKey] === 'undefined') {
      obj[objKey] = undefined;
    } else if (obj[objKey] === 'true') {
      obj[objKey] = true;
    } else if (obj[objKey] === 'false') {
      obj[objKey] = false;
    }
  }

  return obj;
}

export const toRevokeItem = <T extends ApprovalItem>(
  item: T,
  spenderHost: T['list'][number],
  assetApprovalSpenderOrIsContractItem?: AssetApprovalSpender | true
): ApprovalSpenderItemToBeRevoked | undefined => {
  if (item.type === 'contract') {
    const assetApprovalSpender =
      assetApprovalSpenderOrIsContractItem === true
        ? '$indexderSpender' in spenderHost
          ? spenderHost.$indexderSpender
          : null
        : assetApprovalSpenderOrIsContractItem ?? null;

    const permit2Id = assetApprovalSpender?.permit2_id;

    if ('inner_id' in spenderHost) {
      return {
        approvalType: 'contract',
        chainServerId: spenderHost?.chain,
        contractId: spenderHost?.contract_id,
        permit2Id,
        spender: spenderHost?.spender?.id,
        abi: getAbiType(spenderHost),
        nftTokenId: spenderHost?.inner_id,
        isApprovedForAll: false,
      } as const;
    } else if ('contract_name' in spenderHost) {
      return {
        approvalType: 'contract',
        chainServerId: spenderHost?.chain,
        contractId: spenderHost?.contract_id,
        permit2Id,
        spender: spenderHost?.spender?.id,
        nftTokenId: null,
        nftContractName: spenderHost?.contract_name,
        abi: getAbiType(spenderHost),
        isApprovedForAll: true,
      } as const;
    } else {
      return {
        approvalType: 'contract',
        chainServerId: item.chain,
        permit2Id,
        tokenId: spenderHost?.id,
        id: spenderHost?.id,
        spender: item.id,
      };
    }
  }

  if (item.type === 'token') {
    return {
      approvalType: 'token',
      chainServerId: item.chain,
      tokenId: (spenderHost as Spender).id,
      id: item.id,
      spender: (spenderHost as Spender).id,
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
      approvalType: 'nft',
      chainServerId: item?.chain,
      contractId: nftInfo?.contract_id || '',
      spender: (spenderHost as Spender).id,
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

export function dedupeSelectedRows(
  selectedRows?: ApprovalSpenderItemToBeRevoked[]
) {
  const selectedRowsSet = new Set<string>();

  return (selectedRows || []).filter((row) => {
    const key = encodeRevokeItem(row);
    if (selectedRowsSet.has(key)) return false;

    selectedRowsSet.add(key);
    return true;
  });
}

export type TableSelectResult = {
  isSelectedAll: boolean;
  isIndeterminate: boolean;
};
export function isSelectedAllContract(
  contractApprovals: ContractApprovalItem[],
  selectedRows: ApprovalSpenderItemToBeRevoked[]
) {
  const set = new Set<string>(selectedRows.map((x) => encodeRevokeItem(x)));
  const result: TableSelectResult = {
    isSelectedAll: true,
    isIndeterminate: false,
  };

  const hasSelected = selectedRows.length > 0;

  for (const contractApproval of contractApprovals) {
    const selectedSpenderHosts = contractApproval.list.filter((spenderHost) => {
      const revokeItem = toRevokeItem(contractApproval, spenderHost, true);
      return revokeItem && set.has(encodeRevokeItem(revokeItem));
    });

    const isIndeterminate =
      selectedSpenderHosts.length > 0 &&
      selectedSpenderHosts.length < contractApproval.list.length;

    const noSelectAll = isIndeterminate || selectedSpenderHosts.length === 0;

    if (noSelectAll) {
      result.isIndeterminate = hasSelected;
      result.isSelectedAll = false;
      break;
    }
  }

  return result;
}

export function isSelectedAllAssetApprovals(
  spenders: AssetApprovalSpender[],
  selectedRows: ApprovalSpenderItemToBeRevoked[]
) {
  const set = new Set<string>(selectedRows.map((x) => encodeRevokeItem(x)));
  const result: TableSelectResult = {
    isSelectedAll: true,
    isIndeterminate: false,
  };

  const hasSelected = set.size > 0;

  for (const spender of spenders) {
    const revokeItem = toRevokeItem(
      spender.$assetContract!,
      spender.$assetToken!,
      spender
    );

    if (!revokeItem) break;

    if (!set.has(encodeRevokeItem(revokeItem))) {
      result.isIndeterminate = hasSelected;
      result.isSelectedAll = false;
      break;
    }
  }

  return result;
}
