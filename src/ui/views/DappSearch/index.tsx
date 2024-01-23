import { ReactComponent as RcIconClose } from '@/ui/assets/dapp-search/cc-close.svg';
import { ReactComponent as RcIconDropdown } from '@/ui/assets/dapp-search/cc-dropdown.svg';
import { ReactComponent as RcIconSearch } from '@/ui/assets/dapp-search/cc-search.svg';
import { ChainSelectorLargeModal } from '@/ui/component/ChainSelector/LargeModal';
import { splitNumberByStep, useWallet } from '@/ui/utils';
import { findChainByEnum } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import { BasicDappInfo } from '@rabby-wallet/rabby-api/dist/types';
import {
  useDebounce,
  useInfiniteScroll,
  useMount,
  useRequest,
  useScroll,
  useTitle,
} from 'ahooks';
import { Input } from 'antd';
import clsx from 'clsx';
import { keyBy, range } from 'lodash';
import React, { useEffect, useMemo, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { DappFavoriteList } from './components/DappFavoriteList';
import { DappSearchResult } from './components/DappSearchResult';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { ConnectedSite } from '@/background/service/permission';
const { Search } = Input;

const SearchWrapper = styled.div`
  .ant-input-wrapper {
  }

  .ant-input {
    height: 24px;
    line-height: 24px !important;
    font-size: 17px;
  }

  .ant-input-affix-wrapper {
    border-radius: 8px 0 0 8px !important;
    border: 1px solid var(--r-neutral-line, #d3d8e0);
    padding: 13px 15px;
    line-height: 24px !important;
    background: var(--r-neutral-card1, #fff);

    .ant-input-prefix {
      margin-right: 12px;
    }
    .ant-input {
      background-color: transparent;
      color: var(--r-neutral-title1, #192945);
      &::placeholder {
        color: var(--r-neutral-foot, #6a7587);
      }
    }

    &-focused {
      border: 1px solid var(--r-blue-default, #7084ff);
    }
  }
  .ant-input-group-addon {
    border-radius: 0px 8px 8px 0px !important;
  }

  .anticon-close-circle {
    font-size: 16px;
  }

  .ant-btn-primary {
    height: 52px;
    min-width: 120px;
    border-radius: 0px 8px 8px 0px !important;

    color: var(--r-neutral-title2, #fff);
    font-size: 17px;
    font-weight: 500;
    line-height: 20px;
  }
`;

export const DappSearchPage = () => {
  useTitle('Dapp Search - Rabby Wallet');
  const [searchValue, setSearchValue] = React.useState<string>('');
  const [chain, setChain] = React.useState<CHAINS_ENUM>();
  const chainInfo = useMemo(() => {
    return findChainByEnum(chain);
  }, [chain]);
  const [isShowChainSelector, setIsShowChainSelector] = React.useState<boolean>(
    false
  );
  const [isFocus, setIsFocus] = React.useState(false);
  const [favoriteSites, setFavoriteSites] = React.useState<ConnectedSite[]>([]);

  const wallet = useWallet();
  const ref = useRef<HTMLDivElement>(null);

  const debouncedSearchValue = useDebounce(searchValue, {
    wait: 500,
  });

  const { data: sites, runAsync: runGetSites } = useRequest(
    async () => {
      const list = await wallet.getSites();
      return {
        dict: keyBy(list, 'origin'),
        list,
      };
    },
    {
      onSuccess: async (data) => {
        const list = (data?.list || []).filter((item) => item.isFavorite);
        setFavoriteSites(list);
        const res = await wallet.updateSiteBasicInfo(
          list.map((item) => item.origin)
        );
        if (res) {
          setFavoriteSites(res);
        }
      },
    }
  );

  const favoriteSiteInfos = useMemo(() => {
    return favoriteSites
      ?.map((item) => item.info)
      .filter((v): v is BasicDappInfo => !!v);
  }, [favoriteSites]);

  // const { data: hotTags } = useRequest(() => {
  //   return wallet.openapi.getDappHotTags();
  // });

  const hotTags = [];

  const { data, reloadAsync, loading, loadingMore } = useInfiniteScroll(
    async (d) => {
      if (!d?.next) {
        ref.current?.scrollTo(0, 0);
        if (debouncedSearchValue) {
          matomoRequestEvent({
            category: 'DappsSearch',
            action: 'Dapps_Search_Begin',
            label: debouncedSearchValue,
          });
        }
      }
      const limit = d?.page?.limit || 30;
      const start = d?.next || 0;
      const res = await wallet.openapi.searchDapp({
        q: debouncedSearchValue,
        chain_id: chainInfo?.serverId,
        start,
        limit,
      });
      return {
        list: res.dapps,
        page: res.page,
        next: res.page.start + res.page.limit,
      };
    },
    {
      reloadDeps: [debouncedSearchValue, chainInfo?.serverId],
      target: ref,
      isNoMore(data) {
        return !!data && (data?.list?.length || 0) >= data?.page?.total;
      },
    }
  );

  const handleFavoriteChange = async (v: boolean, info: BasicDappInfo) => {
    const origin = `https://${info.id}`;
    const local = sites?.dict?.[origin];
    if (local) {
      await wallet.updateConnectSite(origin, {
        ...local,
        info,
        isFavorite: v,
      });
    } else {
      await wallet.setSite({
        origin,
        icon: info.logo_url || '',
        name: info.name,
        chain: CHAINS_ENUM.ETH,
        isSigned: false,
        info,
        isTop: false,
        isConnected: false,
        isFavorite: v,
      });
    }
    runGetSites();
  };

  const { t } = useTranslation();

  const scroll = useScroll(ref);

  useMount(() => {
    matomoRequestEvent({
      category: 'DappsSearch',
      action: 'Dapps_Search_Enter',
    });
  });

  const total = splitNumberByStep(data?.page?.total || 0);

  return (
    <div
      className="pb-[48px] w-full h-full bg-r-neutral-bg2"
      style={{
        overflow: 'overlay',
      }}
      ref={ref}
    >
      <div
        className={clsx('sticky top-0 z-20 mt-[40px] bg-r-neutral-bg-2', {
          'border-b-[0.5px] border-solid border-rabby-neutral-line':
            (scroll?.top || 0) > 30,
        })}
      >
        <div className="w-[1152px] mx-auto">
          <header className="w-[720px] py-[23px]">
            <SearchWrapper>
              <Search
                placeholder="Search Dapp name"
                allowClear
                enterButton="Search"
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                }}
                onFocus={() => {
                  setIsFocus(true);
                }}
                onBlur={() => {
                  setIsFocus(false);
                }}
                autoFocus
                prefix={
                  <div className="text-r-neutral-body">
                    <RcIconSearch />
                  </div>
                }
                onSearch={(v) => {
                  if (v === debouncedSearchValue) {
                    reloadAsync();
                  }
                }}
              />
            </SearchWrapper>
            {isFocus && !searchValue?.trim() && hotTags?.length ? (
              <div className="flex items-center gap-[12px] flex-wrap mt-[20px]">
                {hotTags?.map((item) => {
                  return (
                    <div
                      key={item}
                      className={clsx(
                        'px-[15px] py-[7px] bg-r-neutral-card1 rounded-[8px] border-[1px] border-transparent',
                        'hover:border-rabby-blue-default hover:bg-r-blue-light1 cursor-pointer',
                        'text-r-neutral-body text-[13px] leading-[16px]'
                      )}
                      onMouseDown={() => {
                        setSearchValue(item);
                      }}
                    >
                      {item}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </header>
        </div>
      </div>
      <div className="w-[1152px] mx-auto">
        <div className="flex items-start gap-[32px]">
          <main className="w-[720px]">
            <DappSearchResult
              data={data?.list || []}
              loading={loading}
              loadingMore={loadingMore}
              siteDict={sites?.dict || {}}
              onFavoriteChange={handleFavoriteChange}
              leftSlot={
                debouncedSearchValue ? (
                  <div className="text-[14px] leading-[16px] text-r-neutral-foot">
                    <Trans
                      i18nKey="page.dappSearch.searchResult.foundDapps"
                      values={{
                        count: total,
                      }}
                    >
                      Found{' '}
                      <span className="text-r-neutral-body font-medium">
                        {total}
                      </span>{' '}
                      Dapps
                    </Trans>
                  </div>
                ) : (
                  <div className="text-[14px] leading-[16px] text-r-neutral-foot">
                    <Trans
                      i18nKey="page.dappSearch.searchResult.totalDapps"
                      values={{
                        count: total,
                      }}
                    >
                      Total{' '}
                      <span className="text-r-neutral-body font-medium">
                        {total}
                      </span>{' '}
                      Dapps
                    </Trans>
                  </div>
                )
              }
              rightSlot={
                <div
                  onClick={() => {
                    setIsShowChainSelector(true);
                  }}
                >
                  {chainInfo ? (
                    <div
                      className={clsx(
                        'rounded-[4px] bg-r-neutral-card1',
                        'border-[0.5px] border-solid border-rabby-neutral-line',
                        'flex items-center cursor-pointer',
                        'p-[2px]'
                      )}
                    >
                      <div
                        className={clsx(
                          'flex items-center gap-[6px] py-[4px] pl-[9px] pr-[3px] rounded-[2px]',
                          'hover:bg-r-blue-light1'
                        )}
                      >
                        <img
                          src={chainInfo?.logo}
                          className="w-[20px] h-[20px] rounded-full"
                        />
                        <span className="text-r-neutral-body text-[14px] leading-[17px] font-medium">
                          {chainInfo?.name}
                        </span>
                      </div>
                      <span
                        className="p-[7px] cursor-pointer text-r-neutral-foot rounded-[2px] hover:bg-r-blue-light1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setChain(undefined);
                        }}
                      >
                        <RcIconClose />
                      </span>
                    </div>
                  ) : (
                    <div
                      className={clsx(
                        'flex items-center gap-[2px] cursor-pointer',
                        'text-r-neutral-body font-medium text-[13px] leading-[16px]'
                      )}
                    >
                      {t('page.dappSearch.selectChain')}
                      <RcIconDropdown />
                    </div>
                  )}
                </div>
              }
            />
          </main>
          <aside className="flex-1">
            <DappFavoriteList
              data={favoriteSiteInfos}
              onFavoriteChange={handleFavoriteChange}
            />
          </aside>
        </div>
      </div>
      <ChainSelectorLargeModal
        visible={isShowChainSelector}
        title="Select chain"
        value={chain}
        hideTestnetTab
        onChange={(v) => {
          setChain(v);
          setIsShowChainSelector(false);
        }}
        onCancel={() => {
          setIsShowChainSelector(false);
        }}
      />
    </div>
  );
};
