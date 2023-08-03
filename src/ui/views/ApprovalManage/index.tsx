import { useRabbySelector } from '@/ui/store';
import { Dropdown, Input, Menu } from 'antd';
import { CHAINS_ENUM } from 'consts';
import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useAsync, useThrottleFn } from 'react-use';
import IconSearch from 'ui/assets/search.svg';
import { Empty, PageHeader } from 'ui/component';
import { useWallet } from 'ui/utils';
import { Loading } from './components/Loading';
import './style.less';
import PQueue from 'p-queue';
import { VariableSizeList } from 'react-window';
import {
  ApprovalItem,
  ContractApprovalItem,
  NftApprovalItem,
  TokenApprovalItem,
  getContractRiskEvaluation,
  makeComputedRiskAboutValues,
} from '@/utils/approval';
import { RevokeApprovalDrawer } from './components/RevokeApprovalDrawer';
import { groupBy, sortBy, flatten } from 'lodash';
import { ReactComponent as IconDownArrow } from 'ui/assets/approval-management/down.svg';
import IconUnknownNFT from 'ui/assets/unknown-nft.svg';
import IconUnknownToken from 'ui/assets/token-default.svg';
import { ApprovalContractItem } from './components/ApprovalContractItem';

const FILTER_TYPES = {
  contract: 'By Contracts',
  token: 'By Tokens',
  nft: 'By NFTs',
};

const ApprovalManage = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const history = useHistory();

  const account = useRabbySelector((state) => state.account.currentAccount);
  const chain = useRabbySelector(
    (state) =>
      state.preference.tokenApprovalChain[
        account?.address?.toLowerCase() || ''
      ] || CHAINS_ENUM.ETH
  );

  const [filterType, setFilterType] = useState<keyof typeof FILTER_TYPES>(
    'contract'
  );

  const [value, setValue] = useState('');
  const search = useThrottleFn(
    (value) => {
      if (sizeMap.current && listRef?.current) {
        sizeMap.current = {};
        listRef?.current.resetAfterIndex(0);
      }
      return value;
    },
    200,
    [value]
  );

  const [selectedItem, setSelectedItem] = useState<ApprovalItem | undefined>();
  const [visible, setVisible] = useState(false);

  const onClose = () => setVisible(false);
  const onSelect = useCallback((i: ApprovalItem) => {
    setSelectedItem(i);
    setVisible(true);
  }, []);

  const queueRef = useRef(new PQueue({ concurrency: 40 }));

  const { value: allData, loading, error } = useAsync(async () => {
    const userAddress = account!.address;
    const usedChainList = await wallet.openapi.usedChainList(userAddress);

    const contractMap: Record<string, ContractApprovalItem> = {};
    const tokenMap: Record<string, TokenApprovalItem> = {};
    const nftMap: Record<string, NftApprovalItem> = {};
    await queueRef.current.clear();
    const nftAuthorizedQueryList = usedChainList.map((e) => async () => {
      try {
        const data = await wallet.openapi.userNFTAuthorizedList(
          userAddress,
          e.id
        );
        if (data.total) {
          data.contracts.forEach((contract) => {
            const chainName = contract.chain;
            const contractId = contract.spender.id;
            const spender = contract.spender;

            if (!contractMap[`${chainName}:${contractId}`]) {
              const $riskAboutValues = makeComputedRiskAboutValues(
                'nft-contract',
                spender
              );
              contractMap[`${chainName}:${contractId}`] = {
                list: [],
                chain: e.id,
                type: 'contract',
                contractFor: 'nft-contract',
                $riskAboutValues,
                $contractRiskEvaluation: getContractRiskEvaluation(
                  spender.risk_level,
                  $riskAboutValues
                ),
                risk_level: spender.risk_level,
                risk_alert: spender.risk_alert,
                id: spender.id,
                name: spender?.protocol?.name || 'Unknown Contract',
                logo_url: spender.protocol?.logo_url,
              };
            }
            contractMap[`${chainName}:${contractId}`].list.push(contract);

            if (!nftMap[`${chainName}:${contract.contract_id}`]) {
              const spender = contract.spender;
              nftMap[`${chainName}:${contract.contract_id}`] = {
                nftContract: contract,
                list: [],
                type: 'nft',
                $riskAboutValues: makeComputedRiskAboutValues('nft', spender),
                risk_level: 'safe',
                id: contract.contract_id,
                name: contract.contract_name,
                logo_url:
                  (contract as any)?.collection?.logo_url || IconUnknownNFT,
                amount: contract.amount,
                chain: e.id,
              };
            }
            nftMap[`${chainName}:${contract.contract_id}`].list.push(
              contract.spender
            );
          });

          data.tokens.forEach((token) => {
            const chainName = token.chain;
            const contractId = token.spender.id;
            const spender = token.spender;

            if (!contractMap[`${token.chain}:${contractId}`]) {
              const $riskAboutValues = makeComputedRiskAboutValues(
                'nft',
                spender
              );
              contractMap[`${token.chain}:${contractId}`] = {
                list: [],
                chain: e.id,
                risk_level: spender.risk_level,
                risk_alert: spender.risk_alert,
                id: spender.id,
                name: spender?.protocol?.name || 'Unknown Contract',
                logo_url: spender.protocol?.logo_url || IconUnknownNFT,
                type: 'contract',
                contractFor: 'nft',
                $riskAboutValues,
                $contractRiskEvaluation: getContractRiskEvaluation(
                  spender.risk_level,
                  $riskAboutValues
                ),
              };
            }
            contractMap[`${chainName}:${contractId}`].list.push(token);

            const nftTokenKey = `${chainName}:${token.contract_id}:${token.inner_id}`;
            if (!nftMap[nftTokenKey]) {
              nftMap[nftTokenKey] = {
                nftToken: token,
                list: [],
                chain: e.id,
                risk_level: 'safe',
                id: token.contract_id,
                name: token.contract_name,
                logo_url: token?.content || (token as any).collection?.logo_url,
                type: 'nft',
                $riskAboutValues: makeComputedRiskAboutValues('nft', spender),
                amount: token.amount,
              };
            }
            nftMap[nftTokenKey].list.push(token.spender);
          });
        }
      } catch (error) {
        console.error('fetch userNFTAuthorizedList error', error);
      }
    });

    const tokenAuthorizedQueryList = usedChainList.map((e) => async () => {
      try {
        const data = await wallet.openapi.tokenAuthorizedList(
          userAddress,
          e.id
        );
        if (data.length) {
          data.forEach((token) => {
            token.spenders.forEach((spender) => {
              const $riskAboutValues = makeComputedRiskAboutValues(
                'token',
                spender
              );
              const chainName = token.chain;
              const contractId = spender.id;
              if (!contractMap[`${chainName}:${contractId}`]) {
                contractMap[`${chainName}:${contractId}`] = {
                  list: [],
                  chain: token.chain,
                  risk_level: spender.risk_level,
                  risk_alert: spender.risk_alert,
                  id: spender.id,
                  name: spender?.protocol?.name || 'Unknown Contract',
                  logo_url: spender.protocol?.logo_url,
                  type: 'contract',
                  contractFor: 'token',
                  $riskAboutValues,
                  $contractRiskEvaluation: getContractRiskEvaluation(
                    spender.risk_level,
                    $riskAboutValues
                  ),
                };
              }
              contractMap[`${chainName}:${contractId}`].list.push(token);

              const tokenId = token.id;

              if (!tokenMap[`${chainName}:${tokenId}`]) {
                tokenMap[`${chainName}:${tokenId}`] = {
                  list: [],
                  chain: e.id,
                  risk_level: 'safe',
                  id: token.id,
                  name: token.symbol,
                  logo_url: token.logo_url || IconUnknownToken,
                  type: 'token',
                  $riskAboutValues: makeComputedRiskAboutValues(
                    'token',
                    spender
                  ),
                  balance: token.balance,
                };
              }
              tokenMap[`${chainName}:${tokenId}`].list.push(spender);
            });
          });
        }
      } catch (error) {
        console.error('fetch tokenAuthorizedList error:', error);
      }
    });
    await queueRef.current.addAll([
      ...nftAuthorizedQueryList,
      ...tokenAuthorizedQueryList,
    ]);

    sortTokenOrNFTApprovalsSpenderList(tokenMap);
    sortTokenOrNFTApprovalsSpenderList(nftMap);

    return [contractMap, tokenMap, nftMap];
  });

  const [contractMap, tokenMap, nftMap] = allData || [];

  if (error) {
    console.log('error', error);
  }

  const sortedContractList: ApprovalItem[] = useMemo(() => {
    if (contractMap) {
      const filterMap = {
        contract: contractMap,
        token: tokenMap,
        nft: nftMap,
      };
      const contractMapArr = Object.values(filterMap[filterType]);
      const l = contractMapArr.length;
      const dangerList: ApprovalItem[] = [];
      const warnList: ApprovalItem[] = [];
      const safeList: ApprovalItem[] = [];
      const numMap: Record<string, string> = {
        safe: 'safe',
        warning: 'warning',
        danger: 'danger',
      };
      for (let i = 0; i < l; i++) {
        const item = contractMapArr[i];
        if (item.risk_level === numMap.warning) {
          warnList.push(item);
        } else if (item.risk_level === numMap.danger) {
          dangerList.push(item);
        } else {
          safeList.push(item);
        }
      }

      const groupedSafeList = groupBy(safeList, (item) => item.chain);
      const sorted = sortBy(Object.values(groupedSafeList), 'length');
      const sortedList = sorted.map((e) =>
        sortBy(e, (a) => a.list.length).reverse()
      );
      return [...dangerList, ...warnList, ...flatten(sortedList.reverse())];
    }
    return [];
  }, [contractMap, tokenMap, nftMap, filterType]);

  const displaySortedContractList = useMemo(() => {
    if (!search || search.trim() === '') {
      return sortedContractList;
    }

    const keywords = search.toLowerCase();
    return sortedContractList.filter((e) => {
      return [e.id, e.risk_alert || '', e.name, e.id, e.chain].some((e) =>
        e.toLowerCase().includes(keywords)
      );
    });
  }, [sortedContractList, search]);

  const handleClickBack = useCallback(() => {
    queueRef.current.clear();
    history.replace('/');
  }, []);

  const listRef = useRef<VariableSizeList>(null);
  const sizeMap = useRef<Record<number, number>>({});

  const setSize = useCallback((index: number, size: number) => {
    sizeMap.current = { ...sizeMap.current, [index]: size + 12 };
    listRef?.current?.resetAfterIndex(index);
  }, []);

  const getSize = useCallback(
    (index: number) =>
      filterType === 'contract' ? sizeMap.current[index] || 68 : 68,
    [filterType]
  );

  const subTitle = useMemo(() => {
    if (filterType === 'contract') {
      return 'Approval contract';
    }
    if (filterType === 'token') {
      return 'Token Balance';
    }
    return 'NFT & Collection';
  }, [filterType]);

  useEffect(() => {
    listRef?.current?.scrollToItem(0);
    listRef?.current?.resetAfterIndex?.(0);
  }, [filterType]);

  if (!chain) {
    return null;
  }

  return (
    <div className="token-approval">
      <PageHeader className="mb-0" onBack={handleClickBack} forceShowBack>
        {t('Approvals')}
      </PageHeader>
      <div>
        <div className="flex justify-between items-center mt-[16px]">
          <Input
            className="w-[244px] h-[40px] rounded-[6px] p-0 pl-[12px] "
            size="large"
            prefix={<img className="mr-[10px]" src={IconSearch} />}
            placeholder={'Search by name/address'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            spellCheck={false}
          />
          <Dropdown
            trigger={['click']}
            overlay={
              <Menu className="filter-approval-menu ">
                {(Object.keys(FILTER_TYPES) as Array<
                  keyof typeof FILTER_TYPES
                >).map((e) => {
                  return (
                    <Menu.Item key={e} onClick={() => setFilterType(e)}>
                      {FILTER_TYPES[e]}
                    </Menu.Item>
                  );
                })}
              </Menu>
            }
          >
            <div
              role="button"
              className="bg-white cursor-pointer flex justify-center items-center w-[108px] h-[40px] text-13 text-gray-subTitle hover:text-blue-light  border border-gray-divider hover:border-blue-light rounded-[6px]"
            >
              {FILTER_TYPES[filterType]} <IconDownArrow className="ml-4" />
            </div>
          </Dropdown>
        </div>
        <div className="mt-[16px] mb-[8px] text-12 text-gray-subTitle w-full flex justify-between items-center">
          <span>{subTitle}</span>
        </div>

        <div className="token-approval-list bg-transparent">
          <div className="token-approval-body  min-h-[450px]">
            {loading && <Loading />}

            {!loading &&
              (displaySortedContractList.length <= 0 ? (
                <Empty className="py-[90px]">{t('No Approvals')}</Empty>
              ) : (
                <VariableSizeList
                  ref={listRef}
                  height={450}
                  width="100%"
                  itemCount={displaySortedContractList.length}
                  itemSize={getSize}
                  itemData={displaySortedContractList}
                  // @ts-expect-error it seems there's no `setSize` on `VariableSizeList` of this version react-window
                  setSize={setSize}
                >
                  {({
                    data,
                    index,
                    style,
                  }: {
                    data: ApprovalItem[];
                    index: number;
                    style: CSSProperties;
                  }) => (
                    <div style={style}>
                      <ApprovalContractItem
                        data={data}
                        index={index}
                        setSize={setSize}
                        onClick={onSelect}
                      />
                    </div>
                  )}
                </VariableSizeList>
              ))}
          </div>
        </div>
      </div>
      <RevokeApprovalDrawer
        item={selectedItem}
        visible={visible}
        onClose={onClose}
      />
    </div>
  );
};

function sortTokenOrNFTApprovalsSpenderList(
  item: Record<string, TokenApprovalItem> | Record<string, NftApprovalItem>
) {
  Object.keys(item).forEach((t) => {
    item[t].list
      .sort((a, b) => b.value - a.value)
      .sort((a, b) => {
        const numMap: Record<string, number> = {
          safe: 1,
          warning: 10,
          danger: 100,
        };
        return numMap[b.risk_level] - numMap[a.risk_level];
      });
  });
}

export default ApprovalManage;
