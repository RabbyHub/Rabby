// import { PageHeader } from '@/ui/component';
import { Chain } from '@debank/common';
import { Form, Input, Skeleton } from 'antd';
import React, { ComponentProps, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import IconSearch from 'ui/assets/search.svg';
import clsx from 'clsx';
import {
  useDebounce,
  useInfiniteScroll,
  useMemoizedFn,
  useRequest,
} from 'ahooks';
import { intToHex, useWallet } from '@/ui/utils';
import {
  TestnetChain,
  createTestnetChain,
  TestnetChainBase,
} from '@/background/service/customTestnet';
import { findChain } from '@/utils/chain';
import { id } from 'ethers/lib/utils';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { sortBy } from 'lodash';
import {
  CustomTestnetItem,
  TestnetChainWithRpcList,
} from './components/CustomTestnetItem';
import { useRPCData } from './hooks/useRPCData';
import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from 'ui/component/PageContainer';
import {
  Checkbox,
  Flex,
  SegmentedControl,
  Spinner,
  Switch,
  Text,
  TextField,
  Tooltip,
} from '@radix-ui/themes';
import { LucideSearchCode } from 'lucide-react';
import { Empty } from 'ui/component';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { useChainList } from 'ui/views/CustomTestnet/hooks/useChainList';
import { toast } from 'sonner';

export const ChainListExplorer = () => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const {
    data,
    isLoading: chainListIsLoading,
    error: chainListError,
  } = useChainList();
  const [_search, setSearch] = React.useState('');
  const [showTestNetworks, setShowTestNetworks] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);
  const search = useDebounce(_search, { wait: 100 });

  const handleSelect = async (item) => {
    // form.setFieldsValue(item);
    // setIsShowAddFromChainList(false);
    const ctx = {
      ga: {
        source: '',
      },
    };
    const source = ctx?.ga?.source || 'setting';
    await matomoRequestEvent({
      category: 'Custom Network',
      action: 'Choose ChainList Network',
      label: `${source}_${String(item.id)}`,
    });
  };

  const { data: logos, runAsync: runFetchLogos } = useRequest(
    () => {
      return wallet.getCustomTestnetLogos();
    },
    {
      cacheKey: 'custom-testnet-logos',
      cacheTime: 30000,
      staleTime: 30000,
    }
  );

  /*const { loading, data, loadingMore } = useInfiniteScroll<{
    list: TestnetChainWithRpcList[];
    start: number;
    total: number;
  }>(
    async (data) => {
      const res = await wallet.openapi.searchChainList({
        start: data?.start || 0,
        limit: 50,
        q: search,
      });

      return {
        list: res.chain_list.map((item) => {
          const r = createTestnetChain({
            name: item.name,
            id: item.chain_id,
            nativeTokenSymbol: item.native_currency.symbol,
            rpcUrl: item.rpc || '',
            scanLink: item.explorer || '',
          });
          return {
            ...r,
            rpcList: item.rpc_list,
          };
        }),
        start: res.page.start + res.page.limit,
        total: res.page.total,
      };
    },
    {
      isNoMore(data) {
        return !!data && (data.list?.length || 0) >= (data?.total || 0);
      },
      reloadDeps: [search],
      target: ref,
      threshold: 150,
    }
  );*/

  const { data: usedList, loading: isLoadingUsed } = useRequest(async () => {
    return wallet.getUsedCustomTestnetChainList().then((list) => {
      return sortBy(
        list.map((item) => {
          const res = createTestnetChain({
            name: item.name,
            id: item.chain_id,
            nativeTokenSymbol: item.native_currency.symbol,
            rpcUrl: item.rpc || '',
            scanLink: item.explorer || '',
          });
          return {
            ...res,
            rpcList: item.rpc_list,
          };
        }),
        'name'
      );
    });
  });

  // const isLoading = loading || isLoadingUsed;
  const isLoading = chainListIsLoading || isLoadingUsed;

  /*const _list = useMemo(() => {
    if (search) {
      return data?.list || [];
    }
    return (data?.list || []).filter((item) => {
      return !usedList?.find((used) => used.id === item.id);
    });
  }, [data?.list, usedList, search]);

  const list = useMemo(() => {
    return _list.map((item) => {
      if (logos?.[item.id]) {
        item.logo = logos?.[item.id].chain_logo_url;
      }
      return item;
    });
  }, [_list, logos]);*/

  const list = useMemo(() => {
    const formattedData = data
      ?.map((item) => {
        const r = createTestnetChain({
          name: item.name,
          id: item.chainId,
          nativeTokenSymbol: item.nativeCurrency.symbol,
          rpcUrl: item.rpc?.[0]?.url || '',
          scanLink: item.explorers?.[0]?.url || '',
        });
        return {
          ...r,
          rpcList: item.rpc,
          logo: item.chainSlug || item.icon,
        };
      })
      .filter((it) => {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          it?.name?.toLowerCase().includes(searchLower) ||
          it?.nativeTokenSymbol?.toLowerCase()?.includes(searchLower) ||
          it?.id?.toString().includes(search);

        const isTestNetwork = it?.name
          ?.toString()
          ?.toLowerCase()
          ?.includes('testnet');

        return matchesSearch && (!showTestNetworks || isTestNetwork);
      });

    /*return formattedData?.filter(() => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        formattedData?.name?.toLowerCase().includes(searchLower) ||
        formattedData?.nativeTokenSymbol?.toLowerCase().includes(searchLower) ||
        formattedData?.id?.toString().includes(search);

      const isTestNetwork = formattedData?.name
        ?.toString()
        ?.toLowerCase()
        ?.includes('testnet');

      return matchesSearch && (!showTestNetworks || isTestNetwork);
    });*/
    return formattedData;
  }, [search, showTestNetworks, isLoading]);

  const realUsedList = useMemo(() => {
    return usedList?.map((item) => {
      if (logos?.[item.id]) {
        item.logo = logos?.[item.id].chain_logo_url;
      }
      return item;
    });
  }, [usedList, logos]);

  const isEmpty = useMemo(() => {
    // if (isLoading) {
    //   return false;
    // }
    if (chainListIsLoading) {
      return false;
    }
    if (search) {
      return !list?.length;
    }
    return !usedList?.length && !list?.length;
  }, [isLoading, search, list, usedList]);

  /*const filteredChains = Object.entries(list || {}).filter(([_, chainData]) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      chainData?.name.toLowerCase().includes(searchLower) ||
      chainData?.nativeTokenSymbol.symbol.toLowerCase().includes(searchLower) ||
      chainData?.id.toString().includes(search);

    const isTestNetwork = chainData?.name
      .toString()
      .toLowerCase()
      .includes('testnet');
    return matchesSearch && (!showTestNetworks || isTestNetwork);
  });*/

  return (
    <PageContainer>
      <PageHeader showBackButton>
        <PageHeading>
          {t('page.customTestnet.AddFromChainList.title')}
        </PageHeading>
      </PageHeader>

      <Flex direction={'column'} gap={'4'} p={'3'} className={'bg-grayA6'}>
        <Flex width={'100%'}>
          <TextField.Root
            className={'w-full'}
            placeholder="Search by name, symbol, or chain ID..."
            size={'2'}
            type={'search'}
            value={_search}
            onChange={(e) => setSearch(e.target.value)}
          >
            <TextField.Slot>
              <LucideSearchCode size="16" />
            </TextField.Slot>
          </TextField.Root>
        </Flex>

        <Text as="label" size="2" weight={'medium'}>
          <Flex align={'center'} justify={'between'} gap="2">
            <Flex align={'center'} gap={'2'}>
              {/*<Checkbox
                color={'grass'}
                checked={showTestNetworks}
                size={'2'}
                onCheckedChange={(state) => setShowTestNetworks(state)}
              />*/}
              Show only Testnets
            </Flex>
            <Switch
              color={'grass'}
              checked={showTestNetworks}
              size={'2'}
              onCheckedChange={(state) => setShowTestNetworks(state)}
            />
          </Flex>
        </Text>
      </Flex>

      {/*<SegmentedControl.Root defaultValue="all" radius="large" size={'2'}>
        <SegmentedControl.Item value="all">All</SegmentedControl.Item>
        <SegmentedControl.Item value="mainnet">Mainnet</SegmentedControl.Item>
        <SegmentedControl.Item value="testnet">Testnets</SegmentedControl.Item>
        <SegmentedControl.Item value="added">Added</SegmentedControl.Item>
      </SegmentedControl.Root>*/}

      <PageBody>
        <Flex direction={'column'}>
          {isLoading ? (
            <>
              <Flex
                height={'100%'}
                width={'100%'}
                direction={'column'}
                align={'center'}
                justify={'center'}
              >
                <Flex direction={'column'} align={'center'}>
                  <Spinner size={'3'} />
                  <Text>Loading chain details...</Text>
                  <Loading />
                </Flex>
              </Flex>
              {/*<div className="px-[20px]">
                <div className="rounded-[6px] bg-r-neutral-card2">
                </div>
              </div>*/}
            </>
          ) : isEmpty ? (
            <div className="h-full px-[20px]">
              <div className="h-full rounded-[6px] bg-r-neutral-card2">
                <Empty desc={t('page.customTestnet.AddFromChainList.empty')} />
              </div>
            </div>
          ) : (
            <div ref={ref} className="flex-1 overflow-auto">
              {realUsedList?.length && !search ? (
                <div className="mb-[20px]">
                  <CustomTestnetList
                    list={realUsedList || []}
                    onSelect={handleSelect}
                  />
                </div>
              ) : null}
              {/*<CustomTestnetList
                list={list}
                loading={loading}
                loadingMore={loadingMore}
                onSelect={handleSelect}
              />*/}
              <CustomTestnetList
                list={list}
                loading={chainListIsLoading}
                // loadingMore={loadingMore}
                loadingMore={false}
                onSelect={handleSelect}
              />
            </div>
          )}
        </Flex>
      </PageBody>

      {/*<Wraper className={clsx({ 'translate-x-0': visible }, className)}>
        <div className="px-[20px]">
          <PageHeader className="pt-0" forceShowBack onBack={onClose}>
            {t('page.customTestnet.AddFromChainList.title')}
          </PageHeader>
          <Input
            prefix={<img src={IconSearch} />}
            placeholder={t('page.customTestnet.AddFromChainList.search')}
            onChange={(e) => setSearch(e.target.value)}
            value={_search}
            allowClear
          />
        </div>

        {isLoading ? (
          <div className="px-[20px]">
            <div className="rounded-[6px] bg-r-neutral-card2">
              <Loading />
            </div>
          </div>
        ) : isEmpty ? (
          <div className="h-full px-[20px]">
            <div className="h-full rounded-[6px] bg-r-neutral-card2">
              <Emtpy
                description={t('page.customTestnet.AddFromChainList.empty')}
              />
            </div>
          </div>
        ) : (
          <div ref={ref} className="flex-1 overflow-auto px-[20px]">
            {realUsedList?.length && !search ? (
              <div className="mb-[20px]">
                <CustomTestnetList
                  list={realUsedList || []}
                  onSelect={onSelect}
                />
              </div>
            ) : null}
            <CustomTestnetList
              list={list}
              loading={loading}
              loadingMore={loadingMore}
              onSelect={onSelect}
            />
          </div>
        )}
      </Wraper>*/}
    </PageContainer>
  );
};

const CustomTestnetList = ({
  loadingMore,
  list,
  onSelect,
  className,
}: {
  loading?: boolean;
  loadingMore?: boolean;
  list: TestnetChainWithRpcList[];
  onSelect?: (chain: TestnetChain) => void;
  className?: string;
}) => {
  const { t } = useTranslation();
  const { runAsync } = useRPCData();
  const loadingItemRef = useRef<{ chainId: number | null }>({
    chainId: null,
  });
  const [loadingChainId, setLoadingChainId] = useState<number | null>(null);
  const handleClick = useMemoizedFn(
    async (testnetChain: TestnetChainWithRpcList) => {
      loadingItemRef.current = {
        chainId: testnetChain.id,
      };
      setLoadingChainId(testnetChain.id);
      const sortedRpcList = await runAsync(testnetChain.rpcList || []).catch(
        () => null
      );
      if (loadingItemRef.current.chainId === testnetChain.id) {
        loadingItemRef.current = {
          chainId: null,
        };
        setLoadingChainId(null);
        onSelect?.({
          ...testnetChain,
          rpcUrl: sortedRpcList?.[0]?.url || testnetChain.rpcUrl,
        });
      }
    }
  );

  return (
    <Flex direction={'column'} gap={'2'} py={'2'}>
      {list?.map((item) => {
        const chain = findChain({ id: item.id });

        return chain ? (
          <Tooltip
            content={
              chain?.isTestnet
                ? t('page.customTestnet.AddFromChainList.tips.added')
                : `${item.name} ${t(
                    'page.customTestnet.AddFromChainList.tips.supported'
                  )}`
            }
          >
            <Flex direction={'column'}>
              <CustomTestnetItem disabled chainData={chain} item={item} />
            </Flex>
          </Tooltip>
        ) : (
          <CustomTestnetItem
            item={item}
            key={item.id}
            onClick={handleClick}
            className="relative chain-list-item"
            loading={loadingChainId === item.id}
          />
        );
      })}
      {/*<div className="rounded-[6px] bg-r-neutral-card2">
        {list?.map((item) => {
          const chain = findChain({ id: item.id });

          return chain ? (
              <div className="chain-list-item relative" key={item.id + 'tooltip'}>
                <TooltipWithMagnetArrow
                  className="rectangle w-[max-content]"
                  trigger={['click']}
                  align={{
                    offset: [0, 30],
                  }}
                  placement="top"
                  title={
                    chain?.isTestnet
                      ? t('page.customTestnet.AddFromChainList.tips.added')
                      : t('page.customTestnet.AddFromChainList.tips.supported')
                  }
                >
                  <CustomTestnetItem disabled chainData={chain} item={item} />
                </TooltipWithMagnetArrow>
              </div>
          ) : (
            <CustomTestnetItem
              item={item}
              key={item.id}
              onClick={handleClick}
              className="relative chain-list-item"
              loading={loadingChainId === item.id}
            />
          );
        })}
        {loadingMore ? <Loading /> : null}
      </div>*/}
    </Flex>
  );
};

const Loading = () => {
  return (
    <>
      <div className="chain-list-item relative flex items-center px-[16px] py-[11px] gap-[12px] bg-r-neutral-card2 rounded-[6px]">
        <Skeleton.Avatar active />
        <div className="flex flex-col gap-[4px]">
          <Skeleton.Input active className="w-[80px] h-[16px]" />
          <Skeleton.Input active className="w-[145px] h-[14px]" />
        </div>
      </div>
      <div className="chain-list-item relative flex items-center px-[16px] py-[11px] gap-[12px] bg-r-neutral-card2 rounded-[6px]">
        <Skeleton.Avatar active />
        <div className="flex flex-col gap-[4px]">
          <Skeleton.Input active className="w-[80px] h-[16px]" />
          <Skeleton.Input active className="w-[145px] h-[14px]" />
        </div>
      </div>
    </>
  );
};
