import React, { useEffect, useMemo, useState } from 'react';
import { Input, Drawer, Skeleton, Tooltip } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import TokenWithChain from '../TokenWithChain';
import { TokenItem } from 'background/service/openapi';
import { formatTokenAmount, formatUsdValue } from 'ui/utils/number';
import { getTokenSymbol } from 'ui/utils/token';
import './style.less';
import BigNumber from 'bignumber.js';
import stats from '@/stats';
import { CHAINS_ENUM, CHAINS_LIST, Chain } from '@debank/common';
import { findChainByServerID } from '@/utils/chain';

import MatchImage from 'ui/assets/match.svg';
import IconSearch from 'ui/assets/search.svg';
import IconChainFilterClose from 'ui/assets/chain-select/chain-filter-close.svg';

export const isSwapTokenType = (s: string) =>
  ['swapFrom', 'swapTo'].includes(s);

export interface SearchCallbackCtx {
  chainServerId: Chain['serverId'] | null;
  chainItem: Chain | null;
}
export interface TokenSelectorProps {
  visible: boolean;
  list: TokenItem[];
  isLoading?: boolean;
  onConfirm(item: TokenItem): void;
  onCancel(): void;
  onSearch(
    ctx: SearchCallbackCtx & {
      keyword: string;
    }
  );
  onRemoveChainFilter?(ctx: SearchCallbackCtx);
  type?: 'default' | 'swapFrom' | 'swapTo';
  placeholder?: string;
  chainId: string;
  disabledTips?: string;
  supportChains?: CHAINS_ENUM[] | undefined;
}

const filterTestnetTokenItem = (token: TokenItem) => {
  return !findChainByServerID(token.chain)?.isTestnet;
};

const TokenSelector = ({
  visible,
  list,
  onConfirm,
  onCancel,
  onSearch,
  onRemoveChainFilter,
  isLoading = false,
  type = 'default',
  placeholder,
  chainId: chainServerId,
  disabledTips,
  supportChains,
}: TokenSelectorProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isInputActive, setIsInputActive] = useState(false);

  const { chainItem, chainSearchCtx } = useMemo(() => {
    const chain = !chainServerId ? null : findChainByServerID(chainServerId);
    return {
      chainItem: chain,
      chainSearchCtx: {
        chainServerId,
        chainItem: chain,
      },
    };
  }, [chainServerId, visible]);

  useDebounce(
    () => {
      onSearch({ ...chainSearchCtx, keyword: query });
    },
    150,
    [chainSearchCtx, query]
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
  };

  const displayList = useMemo(() => {
    if (!supportChains?.length) {
      const resultList = list || [];
      if (!chainServerId) return resultList.filter(filterTestnetTokenItem);

      return resultList;
    }

    const varied = (list || []).reduce(
      (accu, token) => {
        const chainItem = findChainByServerID(token.chain);
        const disabled =
          !!supportChains?.length &&
          chainItem &&
          !supportChains.includes(chainItem.enum);

        if (!disabled) {
          accu.natural.push(token);
        } else if (chainItem?.isTestnet && !chainServerId) {
          accu.ignored.push(token);
        } else {
          accu.disabled.push(token);
        }

        return accu;
      },
      {
        natural: [] as TokenItem[],
        disabled: [] as TokenItem[],
        ignored: [] as TokenItem[],
      }
    );

    console.log('[feat] varied', varied);

    return [...varied.natural, ...varied.disabled];
  }, [list, supportChains, chainServerId]);

  const handleInputFocus = () => {
    setIsInputActive(true);
  };

  const handleInputBlur = () => {
    setIsInputActive(false);
  };

  useEffect(() => {
    if (!visible) {
      setQuery('');
    }
  }, [visible]);

  const isEmpty = list.length <= 0;

  const isSwapType = isSwapTokenType(type);

  const isSearchAddr = useMemo(() => {
    const v = query?.trim() || '';
    return v.length === 42 && v.toLowerCase().startsWith('0x');
  }, [query]);

  const NoDataUI = useMemo(
    () =>
      isLoading ? (
        <div>
          {Array(isSwapType ? 8 : 10)
            .fill(1)
            .map((_, i) => (
              <DefaultLoading key={i} />
            ))}
        </div>
      ) : (
        <div className="no-token w-full">
          <img
            className={
              !query || isSearchAddr
                ? 'w-[100px] h-[100px]'
                : 'w-[52px] h-[52px]'
            }
            src={!query || isSearchAddr ? '/images/nodata-tx.png' : MatchImage}
            alt="no site"
          />

          {!query || isSearchAddr ? (
            <p className="text-gray-content text-14 mt-12 text-center mb-0">
              {t('No Tokens')}
            </p>
          ) : (
            <>
              <p className="text-gray-content text-14 mt-12 text-center mb-0">
                No Match
              </p>
              <p className="text-gray-content text-14 mt-0 text-center">
                Try to search contract address on{' '}
                {CHAINS_LIST.find((e) => e.serverId === chainServerId)?.name ||
                  'chain'}
              </p>
            </>
          )}
        </div>
      ),
    [isLoading, isSwapType, t, isSearchAddr, chainServerId]
  );

  useEffect(() => {
    if (query && isSwapType && displayList.length === 0) {
      stats.report('swapTokenSearchFailure', {
        chainId: chainServerId,
        searchType: type === 'swapFrom' ? 'fromToken' : 'toToken',
        keyword: query,
      });
    }
  }, [type, query, isSwapType, displayList, query, chainServerId]);

  return (
    <Drawer
      className="token-selector"
      height="580px"
      placement="bottom"
      visible={visible}
      onClose={onCancel}
    >
      <div className="header">{t('Select a token')}</div>
      <div className="input-wrapper">
        <Input
          className={clsx({ active: isInputActive })}
          size="large"
          prefix={<img src={IconSearch} />}
          placeholder={placeholder ?? t('Search by Name / Address')}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          autoFocus
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
      </div>
      <div className="filters-wrapper">
        {chainItem && (
          <>
            <div className="filter-item__chain">
              <img
                className="filter-item__chain-logo"
                src={chainItem.logo}
                alt={chainItem.name}
              />
              <span className="ml-[4px]">{chainItem.name}</span>
              <div
                className="py-4 cursor-pointer"
                onClick={() => {
                  onRemoveChainFilter?.({ chainServerId, chainItem });
                  onSearch({
                    chainItem: null,
                    chainServerId: '',
                    keyword: query,
                  });
                }}
              >
                <img
                  className="filter-item__chain-close w-[12px] h-[12px] ml-[6px]"
                  src={IconChainFilterClose}
                />
              </div>
            </div>
          </>
        )}
      </div>
      <ul className={clsx('token-list', { empty: isEmpty })}>
        <li className="token-list__header">
          <div>ASSET / AMOUNT</div>
          <div>PRICE</div>
          <div>USD VALUE</div>
        </li>
        {isEmpty
          ? NoDataUI
          : displayList.map((token) => {
              const chainItem = findChainByServerID(token.chain);
              const disabled =
                !!supportChains?.length &&
                chainItem &&
                !supportChains.includes(chainItem.enum);

              return (
                <Tooltip
                  key={`${token.chain}-${token.id}`}
                  trigger={['click', 'hover']}
                  mouseEnterDelay={3}
                  overlayClassName={clsx('rectangle left-[20px]')}
                  placement="top"
                  title={disabledTips}
                  visible={disabled ? undefined : false}
                >
                  <li
                    className={clsx(
                      'token-list__item h-[52px]',
                      disabled && 'opacity-50'
                    )}
                    onClick={() => !disabled && onConfirm(token)}
                  >
                    <div>
                      <TokenWithChain
                        token={token}
                        width="24px"
                        height="24px"
                        hideConer
                      />
                      <div className="flex flex-col gap-4">
                        <span
                          className="symbol text-13 text-gray-title font-medium"
                          title={token.amount.toString()}
                        >
                          {formatTokenAmount(token.amount)}
                        </span>
                        <span className="symbol" title={getTokenSymbol(token)}>
                          {getTokenSymbol(token)}
                        </span>
                      </div>
                    </div>

                    <div>{formatUsdValue(token.price)}</div>

                    <div className="flex flex-col text-right items-end">
                      <div
                        title={formatUsdValue(
                          new BigNumber(token.price || 0)
                            .times(token.amount)
                            .toFixed()
                        )}
                        className={clsx(
                          'max-w-full text-13 text-gray-title',
                          'truncate'
                        )}
                      >
                        {formatUsdValue(
                          new BigNumber(token.price || 0)
                            .times(token.amount)
                            .toFixed()
                        )}
                      </div>
                    </div>
                  </li>
                </Tooltip>
              );
            })}
      </ul>
    </Drawer>
  );
};

const DefaultLoading = () => (
  <div className="flex justify-between items-center py-10 pl-[20px] pr-[17px]">
    <div className="gap-x-12 flex">
      <Skeleton.Input
        active
        className="rounded-full w-[24px] h-[24px] bg-gray-bg"
      />
      <div className="gap-y-2 flex flex-col">
        <Skeleton.Input
          active
          className="bg-gray-bg rounded-[2px] w-[72px] h-[15px]"
        />
        <Skeleton.Input
          active
          className="bg-gray-bg rounded-[2px] w-[44px] h-[10px]"
        />
      </div>
    </div>
    <div>
      <Skeleton.Input
        active
        className="bg-gray-bg rounded-[2px] w-[72px] h-[20px]"
      />
    </div>
    <div>
      <Skeleton.Input
        active
        className="bg-gray-bg rounded-[2px] w-[72px] h-[20px]"
      />
    </div>
  </div>
);

export default TokenSelector;
