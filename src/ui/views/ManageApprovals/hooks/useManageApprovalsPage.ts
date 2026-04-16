import React from 'react';
import { useRequest } from 'ahooks';
import PQueue from 'p-queue';
import { flatten, groupBy, sortBy } from 'lodash';

import { useDebouncedValue } from '@/ui/hooks/useDebounceValue';
import { useWallet } from '@/ui/utils';
import type { Account } from '@/background/service/preference';
import {
  ApprovalItem,
  AssetApprovalItem,
  AssetApprovalSpender,
  ContractApprovalItem,
  NftApprovalItem,
  TokenApprovalItem,
  getContractRiskEvaluation,
  makeComputedRiskAboutValues,
  markContractTokenSpender,
  markParentForAssetItemSpender,
  RiskNumMap,
  compareContractApprovalItemByRiskLevel,
} from '@/utils/approval';
import { ApprovalSpenderItemToBeRevoked } from '@/utils/approve';
import { summarizeRevoke } from '@/utils/approve';
import { KEYRING_CLASS } from '@/constant';
import { getAddressScanLink } from '@/utils';
import { obj2query } from '@/ui/utils/url';
import { findChainByServerID } from '@/utils/chain';
import { useBatchRevoke } from '../../ManageBatchApprovals/hooks/useBatchRevoke';
import type {
  NFTApproval,
  NFTApprovalContract,
  Spender,
} from '@/background/service/openapi';

export type {
  ApprovalItem,
  AssetApprovalItem,
  AssetApprovalSpender,
  ContractApprovalItem,
  NftApprovalItem,
  TokenApprovalItem,
};
export type { ApprovalSpenderItemToBeRevoked };

export const FILTER_TYPES = {
  contract: 'contract',
  assets: 'assets',
  EIP7702: 'EIP7702',
} as const;

export type ApprovalProcessType = 'contract' | 'assets';
export type RevokeItemDict = Record<string, ApprovalSpenderItemToBeRevoked>;

function sortTokenOrNFTApprovalsSpenderList(
  approval: TokenApprovalItem | NftApprovalItem
) {
  approval.list = approval.list.sort((left, right) => {
    const riskComparison =
      RiskNumMap[right.risk_level as keyof typeof RiskNumMap] -
      RiskNumMap[left.risk_level as keyof typeof RiskNumMap];
    if (riskComparison !== 0) {
      return riskComparison;
    }

    return right.value - left.value;
  });
}

function sortAssetApproval<T extends ApprovalItem>(approvals: T[]) {
  const dangerList: T[] = [];
  const warningList: T[] = [];
  const safeList: T[] = [];

  approvals.forEach((item) => {
    if (item.risk_level === 'danger') {
      dangerList.push(item);
      return;
    }
    if (item.risk_level === 'warning') {
      warningList.push(item);
      return;
    }
    safeList.push(item);
  });

  const groupedSafeList = groupBy(safeList, (item) => item.chain);
  const sortedSafeGroups = sortBy(
    Object.values(groupedSafeList),
    'length'
  ).map((items) => sortBy(items, (item) => item.list.length).reverse());

  return {
    finalList: [
      ...dangerList,
      ...warningList,
      ...flatten(sortedSafeGroups.reverse()),
    ],
  };
}

function sortContractApproval(contractApprovals: ContractApprovalItem[]) {
  const riskBuckets = {
    danger2: [] as ContractApprovalItem[],
    danger1: [] as ContractApprovalItem[],
    warning2: [] as ContractApprovalItem[],
    warning1: [] as ContractApprovalItem[],
  };
  const safeList: ContractApprovalItem[] = [];

  contractApprovals.forEach((item) => {
    const evaluation = reEvaluateContractRisk(item);
    if (
      evaluation.serverLevel === 'danger' &&
      evaluation.clientLevel === 'danger'
    ) {
      riskBuckets.danger2.push(item);
    } else if (
      evaluation.serverLevel === 'danger' &&
      evaluation.clientLevel === 'warning'
    ) {
      riskBuckets.danger1.push(item);
    } else if (
      evaluation.serverLevel === 'danger' ||
      evaluation.clientLevel === 'danger'
    ) {
      riskBuckets.warning2.push(item);
    } else if (
      evaluation.serverLevel === 'warning' ||
      evaluation.clientLevel === 'warning'
    ) {
      riskBuckets.warning1.push(item);
    } else {
      safeList.push(item);
    }
  });

  const groupedSafeList = groupBy(safeList, (item) => item.chain);
  const sortedSafeGroups = sortBy(
    Object.values(groupedSafeList),
    'length'
  ).map((items) => sortBy(items, (item) => item.list.length).reverse());

  return [
    ...Object.values(riskBuckets).flat().sort(sortContractListAsCards),
    ...flatten(sortedSafeGroups.reverse()).sort(sortContractListAsCards),
  ];
}

export function encodeApprovalKey(approvalItem: ApprovalItem) {
  return `${approvalItem.type}-${approvalItem.chain}-${approvalItem.id}`;
}

export function makeApprovalIndexURLBase(approval: ApprovalItem) {
  return `approval://${encodeApprovalKey(approval)}`;
}

function getAbiType(spenderHost: ApprovalItem['list'][number]) {
  if ('is_erc721' in spenderHost && spenderHost.is_erc721) {
    return 'ERC721';
  }
  if ('is_erc1155' in spenderHost && spenderHost.is_erc1155) {
    return 'ERC1155';
  }

  return '';
}

export function encodeApprovalSpenderKey<T extends ApprovalItem>(
  approval: T,
  spenderHost: T['list'][number],
  assetApprovalSpenderOrIsContractItem?: AssetApprovalSpender | true
) {
  const approvalIndexBase = makeApprovalIndexURLBase(approval);

  if (approval.type === 'contract') {
    const assetApprovalSpender =
      assetApprovalSpenderOrIsContractItem === true
        ? '$indexderSpender' in spenderHost
          ? spenderHost.$indexderSpender
          : null
        : assetApprovalSpenderOrIsContractItem ?? null;

    const permit2Id = assetApprovalSpender?.permit2_id;

    if ('inner_id' in spenderHost) {
      return `${approvalIndexBase}/contract-token/?${obj2query({
        chainServerId: spenderHost.chain,
        contractId: spenderHost.contract_id,
        permit2Id: permit2Id ?? '',
        spender: spenderHost.spender.id,
        abi: getAbiType(spenderHost),
        nftTokenId: spenderHost.inner_id,
        isApprovedForAll: 'false',
      })}`;
    }

    if ('contract_name' in spenderHost) {
      return `${approvalIndexBase}/contract/?${obj2query({
        chainServerId: spenderHost.chain,
        contractId: spenderHost.contract_id,
        permit2Id: permit2Id ?? '',
        spender: spenderHost.spender.id,
        abi: getAbiType(spenderHost),
        isApprovedForAll: 'true',
      })}`;
    }

    return `${approvalIndexBase}/contract/?${obj2query({
      chainServerId: approval.chain,
      permit2Id: permit2Id ?? '',
      tokenId: spenderHost.id,
      id: spenderHost.id,
      spender: approval.id,
    })}`;
  }

  if (approval.type === 'token') {
    return `${approvalIndexBase}/token/?${obj2query({
      spender: (spenderHost as Spender).id,
      chainServerId: approval.chain,
      id: approval.id,
    })}`;
  }

  const nftInfo = approval.nftContract || approval.nftToken;
  return `${approvalIndexBase}/nft/?${obj2query({
    chainServerId: approval.chain,
    contractId: nftInfo?.contract_id || '',
    spender: (spenderHost as Spender).id,
    nftTokenId: (nftInfo as NFTApproval)?.inner_id || '',
    abi: nftInfo ? getAbiType(nftInfo) : '',
    isApprovedForAll: nftInfo && 'inner_id' in nftInfo ? 'false' : 'true',
  })}`;
}

export function toRevokeItem<T extends ApprovalItem>(
  item: T,
  spenderHost: T['list'][number],
  assetApprovalSpenderOrIsContractItem?: AssetApprovalSpender | true
): ApprovalSpenderItemToBeRevoked | undefined {
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
        chainServerId: spenderHost.chain,
        contractId: spenderHost.contract_id,
        permit2Id,
        spender: spenderHost.spender.id,
        abi: getAbiType(spenderHost),
        nftTokenId: spenderHost.inner_id,
        isApprovedForAll: false,
      };
    }

    if ('contract_name' in spenderHost) {
      return {
        approvalType: 'contract',
        chainServerId: spenderHost.chain,
        contractId: spenderHost.contract_id,
        permit2Id,
        spender: spenderHost.spender.id,
        nftTokenId: null,
        nftContractName: spenderHost.contract_name,
        abi: getAbiType(spenderHost),
        isApprovedForAll: true,
      };
    }

    return {
      approvalType: 'contract',
      chainServerId: item.chain,
      permit2Id,
      tokenId: spenderHost.id,
      id: spenderHost.id,
      spender: item.id,
    };
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

  const nftInfo = item.nftContract || item.nftToken;
  return {
    approvalType: 'nft',
    chainServerId: item.chain,
    contractId: nftInfo?.contract_id || '',
    spender: (spenderHost as Spender).id,
    nftTokenId: (nftInfo as NFTApproval)?.inner_id || null,
    abi: nftInfo ? getAbiType(nftInfo) : '',
    isApprovedForAll: nftInfo && 'inner_id' in nftInfo ? false : true,
  };
}

export function parseApprovalSpenderSelection(
  approval: ApprovalItem | null,
  type: ApprovalProcessType,
  maps: {
    curAllSelectedMap: RevokeItemDict;
    nextKeepMap?: RevokeItemDict;
  }
) {
  const preset = {
    curSelectedSpenderKeys: new Set<string>(),
    curSelectedMap: {} as RevokeItemDict,
    isSelectedAll: false,
    isSelectedPartial: false,
    postSelectedMap: {
      ...maps.curAllSelectedMap,
    } as RevokeItemDict,
  };

  if (!approval) {
    return preset;
  }

  approval.list.forEach((member) => {
    const selectionKey =
      type === 'assets'
        ? encodeApprovalSpenderKey(
            (member as AssetApprovalSpender).$assetContract!,
            (member as AssetApprovalSpender).$assetToken!,
            member as AssetApprovalSpender
          )
        : encodeApprovalSpenderKey(approval, member, true);

    const nextSelected = maps.nextKeepMap?.[selectionKey];

    if (maps.curAllSelectedMap[selectionKey]) {
      preset.curSelectedSpenderKeys.add(selectionKey);
      preset.curSelectedMap[selectionKey] =
        maps.curAllSelectedMap[selectionKey];

      if (!nextSelected) {
        delete preset.postSelectedMap[selectionKey];
      }
    }

    if (nextSelected) {
      preset.postSelectedMap[selectionKey] = nextSelected;
    }
  });

  preset.isSelectedAll =
    approval.list.length === preset.curSelectedSpenderKeys.size;
  preset.isSelectedPartial =
    !preset.isSelectedAll && preset.curSelectedSpenderKeys.size > 0;

  return preset;
}

export function buildSelectionMapForApproval(
  approval: ApprovalItem,
  type: ApprovalProcessType,
  nextSelectAll: boolean
) {
  const nextSelectedMap: RevokeItemDict = {};

  if (!nextSelectAll) {
    return nextSelectedMap;
  }

  approval.list.forEach((member) => {
    const revokeItem =
      type === 'assets'
        ? toRevokeItem(
            (member as AssetApprovalSpender).$assetContract!,
            (member as AssetApprovalSpender).$assetToken!,
            member as AssetApprovalSpender
          )
        : toRevokeItem(approval, member, true);

    const key =
      type === 'assets'
        ? encodeApprovalSpenderKey(
            (member as AssetApprovalSpender).$assetContract!,
            (member as AssetApprovalSpender).$assetToken!,
            member as AssetApprovalSpender
          )
        : encodeApprovalSpenderKey(approval, member, true);

    if (revokeItem) {
      nextSelectedMap[key] = revokeItem;
    }
  });

  return nextSelectedMap;
}

export function mergeSelectionMapForApproval(
  approval: ApprovalItem,
  type: ApprovalProcessType,
  currentMap: RevokeItemDict,
  draftMap: RevokeItemDict
) {
  return parseApprovalSpenderSelection(approval, type, {
    curAllSelectedMap: currentMap,
    nextKeepMap: draftMap,
  }).postSelectedMap;
}

export function getAssetApprovalPrimaryText(assetApproval: AssetApprovalItem) {
  if (assetApproval.type === 'token') {
    return assetApproval.name || 'Unknown';
  }

  if (assetApproval.nftToken) {
    return `${assetApproval.name || 'Unknown'} #${
      assetApproval.nftToken.inner_id
    }`;
  }

  return assetApproval.name || 'Unknown';
}

export function getContractApprovalMemberText(
  member: ContractApprovalItem['list'][number]
) {
  if ('symbol' in member) {
    return member.symbol || member.id;
  }
  if ('contract_name' in member) {
    const contractMember = member as NFTApprovalContract;
    return contractMember.contract_name || contractMember.contract_id;
  }
  if ('inner_id' in member) {
    const nftMember = member as NFTApproval;
    return `${nftMember.contract_name || nftMember.contract_id} #${
      nftMember.inner_id
    }`;
  }
  return (member as Spender).id;
}

export function getAssetSpenderText(spender: AssetApprovalSpender) {
  return spender.protocol?.name || spender.id;
}

export function sortContractListAsCards(
  left: ContractApprovalItem,
  right: ContractApprovalItem
) {
  const comparison = compareContractApprovalItemByRiskLevel(left, right);
  if (comparison) {
    return -comparison;
  }

  return (
    reEvaluateContractRisk(right).totalRiskScore -
      reEvaluateContractRisk(left).totalRiskScore ||
    left.$riskAboutValues.risk_spend_usd_value -
      right.$riskAboutValues.risk_spend_usd_value ||
    right.list.length - left.list.length
  );
}

function reEvaluateContractRisk(contract: ContractApprovalItem) {
  const evaluation = contract.$contractRiskEvaluation;
  const riskNames = Object.entries(RiskNumMap).reduce<Record<number, string>>(
    (accumulator, [name, score]) => {
      accumulator[score] = name;
      return accumulator;
    },
    {}
  );

  return {
    serverLevel: contract.risk_level,
    clientLevel: riskNames[evaluation.clientMaxRiskScore] || 'safe',
    totalRiskScore:
      evaluation.clientTotalRiskScore + evaluation.serverRiskScore * 100,
  };
}

export function useManageApprovalsPage(options: {
  account: Account | null;
  isTestnet?: boolean;
}) {
  const { account } = options;
  const wallet = useWallet();

  const [filterType, setFilterType] = React.useState<keyof typeof FILTER_TYPES>(
    'contract'
  );
  const [searchKw, setSearchKw] = React.useState('');
  const debouncedSearchKw = useDebouncedValue(searchKw, 250);
  const queueRef = React.useRef(new PQueue({ concurrency: 40 }));
  const [isLoadingOnAsyncFn, setIsLoadingOnAsyncFn] = React.useState(false);
  const [approvalsData, setApprovalsData] = React.useState<{
    contractMap: Record<string, ContractApprovalItem>;
    tokenMap: Record<string, TokenApprovalItem>;
    nftMap: Record<string, NftApprovalItem>;
  }>({
    contractMap: {},
    tokenMap: {},
    nftMap: {},
  });
  const emptyApprovalsData = React.useMemo(
    () => ({
      contractMap: {},
      tokenMap: {},
      nftMap: {},
    }),
    []
  );

  const { loading: loadingMaybeWrong, runAsync: loadApprovals } = useRequest(
    async () => {
      if (!account?.address) {
        setApprovalsData(emptyApprovalsData);
        return emptyApprovalsData;
      }

      setIsLoadingOnAsyncFn(true);

      try {
        const openapiClient = options.isTestnet
          ? wallet.testnetOpenapi
          : wallet.openapi;
        const usedChainList = await openapiClient.usedChainList(
          account.address
        );
        const nextApprovalsData = {
          contractMap: {},
          tokenMap: {},
          nftMap: {},
        } as typeof approvalsData;

        queueRef.current.clear();

        const nftAuthorizedQueryList = usedChainList.map(
          (chainItem) => async () => {
            try {
              const data = await openapiClient.userNFTAuthorizedList(
                account.address,
                chainItem.id
              );
              if (!data.total) {
                return;
              }

              data.contracts.forEach((contract) => {
                const spender = contract.spender;
                const contractKey = `${contract.chain}:${spender.id}`;

                if (!nextApprovalsData.contractMap[contractKey]) {
                  const riskValues = makeComputedRiskAboutValues(
                    'nft-contract',
                    spender
                  );
                  nextApprovalsData.contractMap[contractKey] = {
                    list: [],
                    chain: chainItem.id,
                    type: 'contract',
                    contractFor: 'nft-contract',
                    $riskAboutValues: riskValues,
                    $contractRiskEvaluation: getContractRiskEvaluation(
                      spender.risk_level,
                      riskValues
                    ),
                    risk_level: spender.risk_level,
                    risk_alert: spender.risk_alert,
                    id: spender.id,
                    name: spender.protocol?.name || 'Unknown',
                    logo_url: spender.protocol?.logo_url,
                  };
                }
                nextApprovalsData.contractMap[contractKey].list.push(contract);

                const nftKey = `${contract.chain}:${contract.contract_id}`;
                if (!nextApprovalsData.nftMap[nftKey]) {
                  nextApprovalsData.nftMap[nftKey] = {
                    nftContract: contract,
                    list: [],
                    type: 'nft',
                    $riskAboutValues: makeComputedRiskAboutValues(
                      'nft-contract',
                      spender
                    ),
                    risk_level: 'safe',
                    id: contract.contract_id,
                    name: contract.contract_name,
                    logo_url: (contract as any)?.collection?.logo_url,
                    amount: contract.amount,
                    chain: chainItem.id,
                  };
                }
                nextApprovalsData.nftMap[nftKey].list.push(
                  markParentForAssetItemSpender(
                    spender,
                    nextApprovalsData.nftMap[nftKey],
                    nextApprovalsData.contractMap[contractKey],
                    contract
                  )
                );
              });

              data.tokens.forEach((token) => {
                const spender = token.spender;
                const contractKey = `${token.chain}:${spender.id}`;

                if (!nextApprovalsData.contractMap[contractKey]) {
                  const riskValues = makeComputedRiskAboutValues(
                    'nft',
                    spender
                  );
                  nextApprovalsData.contractMap[contractKey] = {
                    list: [],
                    chain: chainItem.id,
                    type: 'contract',
                    contractFor: 'nft',
                    $riskAboutValues: riskValues,
                    $contractRiskEvaluation: getContractRiskEvaluation(
                      spender.risk_level,
                      riskValues
                    ),
                    risk_level: spender.risk_level,
                    risk_alert: spender.risk_alert,
                    id: spender.id,
                    name: spender.protocol?.name || 'Unknown',
                    logo_url: spender.protocol?.logo_url,
                  };
                }
                nextApprovalsData.contractMap[contractKey].list.push(token);

                const nftKey = `${token.chain}:${token.contract_id}:${token.inner_id}`;
                if (!nextApprovalsData.nftMap[nftKey]) {
                  nextApprovalsData.nftMap[nftKey] = {
                    nftToken: token,
                    list: [],
                    chain: chainItem.id,
                    risk_level: 'safe',
                    id: token.contract_id,
                    name: token.contract_name,
                    logo_url:
                      token.content || (token as any).collection?.logo_url,
                    type: 'nft',
                    $riskAboutValues: makeComputedRiskAboutValues(
                      'nft',
                      spender
                    ),
                    amount: token.amount,
                  };
                }
                nextApprovalsData.nftMap[nftKey].list.push(
                  markParentForAssetItemSpender(
                    spender,
                    nextApprovalsData.nftMap[nftKey],
                    nextApprovalsData.contractMap[contractKey],
                    token
                  )
                );
              });
            } catch (error) {
              console.error('fetch userNFTAuthorizedList error', error);
            }
          }
        );

        const tokenAuthorizedQueryList = usedChainList.map(
          (chainItem) => async () => {
            try {
              const data = await openapiClient.tokenAuthorizedList(
                account.address,
                chainItem.id,
                {
                  restfulPrefix: 'v2',
                }
              );
              if (!data.length) {
                return;
              }

              data.forEach((token) => {
                token.spenders.forEach((spender) => {
                  const shapedToken = markContractTokenSpender(token, spender);
                  const contractKey = `${token.chain}:${spender.id}`;

                  if (!nextApprovalsData.contractMap[contractKey]) {
                    const riskValues = makeComputedRiskAboutValues(
                      'token',
                      spender
                    );
                    nextApprovalsData.contractMap[contractKey] = {
                      list: [],
                      chain: token.chain,
                      type: 'contract',
                      contractFor: 'token',
                      $riskAboutValues: riskValues,
                      $contractRiskEvaluation: getContractRiskEvaluation(
                        spender.risk_level,
                        riskValues
                      ),
                      risk_level: spender.risk_level,
                      risk_alert: spender.risk_alert,
                      id: spender.id,
                      name: spender.protocol?.name || 'Unknown',
                      logo_url: spender.protocol?.logo_url,
                    };
                  }
                  nextApprovalsData.contractMap[contractKey].list.push(
                    shapedToken
                  );

                  const tokenKey = `${token.chain}:${shapedToken.id}`;
                  if (!nextApprovalsData.tokenMap[tokenKey]) {
                    nextApprovalsData.tokenMap[tokenKey] = {
                      list: [],
                      chain: chainItem.id,
                      risk_level: 'safe',
                      id: shapedToken.id,
                      name: shapedToken.symbol,
                      logo_url: shapedToken.logo_url,
                      type: 'token',
                      $riskAboutValues: makeComputedRiskAboutValues(
                        'token',
                        spender
                      ),
                      balance: shapedToken.balance,
                    };
                  }
                  nextApprovalsData.tokenMap[tokenKey].list.push(
                    markParentForAssetItemSpender(
                      spender,
                      nextApprovalsData.tokenMap[tokenKey],
                      nextApprovalsData.contractMap[contractKey],
                      shapedToken
                    )
                  );
                });
              });
            } catch (error) {
              console.error('fetch tokenAuthorizedList error', error);
            }
          }
        );

        await queueRef.current.addAll([
          ...nftAuthorizedQueryList,
          ...tokenAuthorizedQueryList,
        ]);

        Object.values(nextApprovalsData.tokenMap).forEach((item) =>
          sortTokenOrNFTApprovalsSpenderList(item)
        );
        Object.values(nextApprovalsData.nftMap).forEach((item) =>
          sortTokenOrNFTApprovalsSpenderList(item)
        );

        setApprovalsData(nextApprovalsData);
        return nextApprovalsData;
      } finally {
        setIsLoadingOnAsyncFn(false);
      }
    },
    {
      manual: true,
      refreshDeps: [
        account?.address,
        options.isTestnet,
        wallet,
        emptyApprovalsData,
      ],
    }
  );

  const isLoading = isLoadingOnAsyncFn && loadingMaybeWrong;

  const sortedContractList = React.useMemo(() => {
    return sortContractApproval(Object.values(approvalsData.contractMap));
  }, [approvalsData.contractMap]);

  const sortedAssetsList = React.useMemo(() => {
    return [
      ...flatten(
        Object.values(approvalsData.tokenMap).map((item) => item.list)
      ),
      ...flatten(Object.values(approvalsData.nftMap).map((item) => item.list)),
    ] as AssetApprovalSpender[];
  }, [approvalsData.nftMap, approvalsData.tokenMap]);

  const sortedAssetApprovalList = React.useMemo(() => {
    const tokenAssets = Object.values(approvalsData.tokenMap);
    const nftAssets = Object.values(approvalsData.nftMap);
    return [
      ...sortAssetApproval(tokenAssets).finalList,
      ...sortAssetApproval(nftAssets).finalList,
    ];
  }, [approvalsData.nftMap, approvalsData.tokenMap]);

  const displaySortedContractList = React.useMemo(() => {
    const keyword = debouncedSearchKw?.trim().toLowerCase();
    if (!keyword) {
      return sortedContractList;
    }

    return sortedContractList.filter((item) =>
      [item.id, item.risk_alert || '', item.name, item.chain]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword))
    );
  }, [debouncedSearchKw, sortedContractList]);

  const displaySortedAssetApprovalList = React.useMemo(() => {
    const keyword = debouncedSearchKw?.trim().toLowerCase();
    if (!keyword) {
      return sortedAssetApprovalList;
    }

    return sortedAssetApprovalList.filter((item) =>
      [item.id, item.risk_alert || '', item.name, item.chain]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword))
    );
  }, [debouncedSearchKw, sortedAssetApprovalList]);

  return {
    isLoading,
    loadApprovals,
    searchKw,
    setSearchKw,
    filterType,
    setFilterType,
    account,
    contractEmptyStatus: !sortedContractList.length
      ? ('none' as const)
      : !displaySortedContractList.length
      ? ('no-matched' as const)
      : false,
    assetEmptyStatus: !sortedAssetApprovalList.length
      ? ('none' as const)
      : !displaySortedAssetApprovalList.length
      ? ('no-matched' as const)
      : false,
    displaySortedContractList,
    displaySortedAssetApprovalList,
    displaySortedAssetsList: sortedAssetsList,
  };
}

function openExternalLink(url?: string | null) {
  if (!url) {
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openAddressOnScan(chainServerId: string | undefined, address: string) {
  if (!chainServerId || !address) {
    return;
  }
  const chain = findChainByServerID(chainServerId);
  openExternalLink(
    chain?.scanLink ? getAddressScanLink(chain.scanLink, address) : null
  );
}

export function useApprovalsPageOnTop(options: {
  account: Account | null;
  isTestnet?: boolean;
  batchRevokePath: string;
}) {
  const approvalsPage = useManageApprovalsPage(options);
  const {
    loadApprovals,
    filterType,
    displaySortedAssetsList,
    account,
  } = approvalsPage;
  const batchRevoke = useBatchRevoke({
    account,
    batchRevokePath: options.batchRevokePath,
    loadApprovals,
  });

  const [
    contractRevokeMap,
    setContractRevokeMap,
  ] = React.useState<RevokeItemDict>({});
  const [assetRevokeMap, setAssetRevokeMap] = React.useState<RevokeItemDict>(
    {}
  );
  const [
    focusedContract,
    setFocusedContract,
  ] = React.useState<ContractApprovalItem | null>(null);
  const [
    focusedAsset,
    setFocusedAsset,
  ] = React.useState<AssetApprovalItem | null>(null);
  const [
    contractDraftMap,
    setContractDraftMap,
  ] = React.useState<RevokeItemDict>({});
  const [assetDraftMap, setAssetDraftMap] = React.useState<RevokeItemDict>({});

  const currentRevokeList = React.useMemo(() => {
    if (filterType === FILTER_TYPES.contract) {
      return Object.values(contractRevokeMap);
    }
    if (filterType === FILTER_TYPES.assets) {
      return Object.values(assetRevokeMap);
    }
    return [] as ApprovalSpenderItemToBeRevoked[];
  }, [assetRevokeMap, contractRevokeMap, filterType]);

  const revokeSummary = React.useMemo(
    () => summarizeRevoke(currentRevokeList),
    [currentRevokeList]
  );

  const onRevoke = React.useCallback(async () => {
    if (!currentRevokeList.length) {
      return;
    }

    const navigated = await batchRevoke(
      currentRevokeList,
      displaySortedAssetsList
    );

    if (navigated) {
      return;
    }

    setContractRevokeMap({});
    setAssetRevokeMap({});
  }, [batchRevoke, currentRevokeList, displaySortedAssetsList]);

  const toggleContractSelection = React.useCallback(
    (approval: ContractApprovalItem) => {
      setContractRevokeMap((previous) => {
        const result = parseApprovalSpenderSelection(approval, 'contract', {
          curAllSelectedMap: previous,
        });

        return mergeSelectionMapForApproval(
          approval,
          'contract',
          previous,
          buildSelectionMapForApproval(
            approval,
            'contract',
            !result.isSelectedAll
          )
        );
      });
    },
    []
  );

  const toggleAssetSelection = React.useCallback(
    (approval: AssetApprovalItem) => {
      setAssetRevokeMap((previous) => {
        const result = parseApprovalSpenderSelection(approval, 'assets', {
          curAllSelectedMap: previous,
        });

        return mergeSelectionMapForApproval(
          approval,
          'assets',
          previous,
          buildSelectionMapForApproval(
            approval,
            'assets',
            !result.isSelectedAll
          )
        );
      });
    },
    []
  );

  const openContractDetail = React.useCallback(
    (approval: ContractApprovalItem) => {
      setFocusedContract(approval);
      setContractDraftMap(
        parseApprovalSpenderSelection(approval, 'contract', {
          curAllSelectedMap: contractRevokeMap,
        }).curSelectedMap
      );
    },
    [contractRevokeMap]
  );

  const openAssetDetail = React.useCallback(
    (approval: AssetApprovalItem) => {
      setFocusedAsset(approval);
      setAssetDraftMap(
        parseApprovalSpenderSelection(approval, 'assets', {
          curAllSelectedMap: assetRevokeMap,
        }).curSelectedMap
      );
    },
    [assetRevokeMap]
  );

  const commitContractDraft = React.useCallback(() => {
    if (!focusedContract) {
      return;
    }
    setContractRevokeMap((previous) =>
      mergeSelectionMapForApproval(
        focusedContract,
        'contract',
        previous,
        contractDraftMap
      )
    );
    setFocusedContract(null);
    setContractDraftMap({});
  }, [contractDraftMap, focusedContract]);

  const commitAssetDraft = React.useCallback(() => {
    if (!focusedAsset) {
      return;
    }
    setAssetRevokeMap((previous) =>
      mergeSelectionMapForApproval(
        focusedAsset,
        'assets',
        previous,
        assetDraftMap
      )
    );
    setFocusedAsset(null);
    setAssetDraftMap({});
  }, [assetDraftMap, focusedAsset]);

  return {
    ...approvalsPage,
    contractRevokeMap,
    setContractRevokeMap,
    assetRevokeMap,
    setAssetRevokeMap,
    focusedContract,
    setFocusedContract,
    focusedAsset,
    setFocusedAsset,
    contractDraftMap,
    setContractDraftMap,
    assetDraftMap,
    setAssetDraftMap,
    currentRevokeList,
    revokeSummary,
    onRevoke,
    toggleContractSelection,
    toggleAssetSelection,
    openContractDetail,
    openAssetDetail,
    commitContractDraft,
    commitAssetDraft,
    openAddressOnScan,
  };
}

const ApprovalsPageContext = React.createContext<ReturnType<
  typeof useApprovalsPageOnTop
> | null>(null);

export { ApprovalsPageContext };

export function useApprovalsPage() {
  const context = React.useContext(ApprovalsPageContext);

  if (!context) {
    throw new Error(
      'useApprovalsPage must be used within ApprovalsPageContext.Provider'
    );
  }

  return context;
}
