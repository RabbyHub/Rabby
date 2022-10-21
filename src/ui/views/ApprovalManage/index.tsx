import {
  NFTApproval,
  NFTApprovalContract,
  Spender,
  TokenApproval,
} from '@/background/service/openapi';
import { useRabbySelector } from '@/ui/store';
import { Input } from 'antd';
import { CHAINS_ENUM } from 'consts';
import React, {
  CSSProperties,
  useCallback,
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
import { ApprovalContractItem } from './components/ApprovalContractItem';
import { RevokeApprovalDrawer } from './components/RevokeApprovalDrawer';

type ApprovalItem = Spender & {
  list: (NFTApprovalContract | NFTApproval | TokenApproval)[];
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

  const [value, setValue] = useState('');
  const search = useThrottleFn((value) => value, 200, [value]);

  const [selectedItem, setSelectedItem] = useState<ApprovalItem | undefined>();
  const [visible, setVisible] = useState(false);

  const onClose = () => setVisible(false);
  const onSelect = useCallback((i: ApprovalItem) => {
    setSelectedItem(i);
    setVisible(true);
  }, []);

  const queueRef = useRef(new PQueue({ concurrency: 40 }));

  const { value: contractMap, loading, error } = useAsync(async () => {
    const userAddress = account!.address;
    const usedChainList = await wallet.openapi.usedChainList(userAddress);

    const contractMap: Record<string, ApprovalItem> = {};
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
            if (!contractMap[`${chainName}:${contractId}`]) {
              contractMap[`${chainName}:${contractId}`] = {
                ...contract.spender,
                list: [],
              };
            }
            contractMap[`${chainName}:${contractId}`].list.push(contract);
          });
          data.tokens.forEach((token) => {
            const chainName = token.chain;
            const contractId = token.spender.id;
            if (!contractMap[`${token.chain}:${token.spender.id}`]) {
              contractMap[`${token.chain}:${contractId}`] = {
                ...token.spender,
                list: [],
              };
            }
            contractMap[`${chainName}:${contractId}`].list.push(token);
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
              const chainName = token.chain;
              const contractId = spender.id;
              if (!contractMap[`${chainName}:${contractId}`]) {
                contractMap[`${chainName}:${contractId}`] = {
                  ...spender,
                  list: [],
                };
              }
              contractMap[`${chainName}:${contractId}`].list.push(token);
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

    return contractMap;
  });

  console.log('contractMap', contractMap);

  if (error) {
    console.log('error', error);
  }

  const sortedContractList: ApprovalItem[] = useMemo(() => {
    if (contractMap) {
      return Object.values(contractMap).sort(
        (a: ApprovalItem, b: ApprovalItem) => {
          const numMap: Record<string, number> = {
            safe: 0,
            warning: 1,
            danger: 100,
          };
          const aNum = numMap[a.risk_level] || 0;
          const bNum = numMap[b.risk_level] || 0;
          return bNum - aNum;
        }
      );
    }
    return [];
  }, [contractMap]);

  const displaySortedContractList = useMemo(() => {
    if (!search || search.trim() === '') {
      return sortedContractList;
    }

    const keywords = search.toLowerCase();
    return sortedContractList.filter((e) => {
      const { name = '', id = '', chain = '' } = e.protocol || {};
      return [e.id, e.risk_alert, name, id, chain].some((e) =>
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
    listRef?.current.resetAfterIndex(index);
  }, []);

  const getSize = useCallback(
    (index: number) => sizeMap.current[index] || 78,
    []
  );

  if (!chain) {
    return null;
  }

  return (
    <div className="token-approval">
      <PageHeader className="mb-0" onBack={handleClickBack} forceShowBack>
        {t('Approvals')}
      </PageHeader>
      <div>
        <Input
          className="h-[40px] rounded-[6px] p-0 pl-[12px] mt-[16px]"
          size="large"
          prefix={<img className="mr-[10px]" src={IconSearch} />}
          placeholder={t('Search contract address')}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
        />
        <div className="mt-[16px] mb-[12px] text-12 text-gray-subTitle">
          You have approvals for the following contracts
        </div>

        <div className="token-approval-list mt-[12px]  bg-transparent">
          <div className="token-approval-body  min-h-[460px]">
            {loading && <Loading />}

            {!loading &&
              (displaySortedContractList.length <= 0 ? (
                <Empty className="py-[90px]">{t('No Approvals')}</Empty>
              ) : (
                <VariableSizeList
                  ref={listRef}
                  height={460}
                  width="100%"
                  itemCount={displaySortedContractList.length}
                  itemSize={getSize}
                  itemData={displaySortedContractList}
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

export default ApprovalManage;
