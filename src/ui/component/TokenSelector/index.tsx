import React, { useEffect, useMemo, useState } from 'react';
import { Input, Drawer, Skeleton, Tooltip, DrawerProps } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useAsync, useDebounce } from 'react-use';
import TokenWithChain from '../TokenWithChain';
import { TokenItem } from 'background/service/openapi';
import { formatTokenAmount, formatUsdValue } from 'ui/utils/number';
import { getTokenSymbol } from 'ui/utils/token';
import './style.less';
import BigNumber from 'bignumber.js';
import stats from '@/stats';
import { CHAINS_ENUM, Chain } from '@debank/common';
import { findChain, findChainByServerID } from '@/utils/chain';

import MatchImage from 'ui/assets/match.svg';
import IconSearch from 'ui/assets/search.svg';
import { ReactComponent as RcIconChainFilterCloseCC } from 'ui/assets/chain-select/chain-filter-close-cc.svg';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { isNil } from 'lodash';
import ThemeIcon from '../ThemeMode/ThemeIcon';
import { ReactComponent as RcIconMatchCC } from '@/ui/assets/match-cc.svg';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useWallet } from '@/ui/utils';
import { useRabbySelector } from '@/ui/store';

export const isSwapTokenType = (s: string) =>
  ['swapFrom', 'swapTo'].includes(s);

export interface SearchCallbackCtx {
  chainServerId: Chain['serverId'] | null;
  chainItem: Chain | null | undefined;
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
  type?: 'default' | 'swapFrom' | 'swapTo' | 'bridgeFrom';
  placeholder?: string;
  chainId: string;
  disabledTips?: React.ReactNode;
  supportChains?: CHAINS_ENUM[] | undefined;
  drawerHeight?: number | string;
  excludeTokens?: TokenItem['id'][];
  getContainer?: DrawerProps['getContainer'];
}

const filterTestnetTokenItem = (token: TokenItem) => {
  return !findChainByServerID(token.chain)?.isTestnet;
};

const defaultExcludeTokens = [];

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
  drawerHeight = '540px',
  excludeTokens = defaultExcludeTokens,
  getContainer,
}: TokenSelectorProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isInputActive, setIsInputActive] = useState(false);

  const { chainItem, chainSearchCtx, isTestnet } = useMemo(() => {
    const chain = !chainServerId
      ? null
      : findChain({ serverId: chainServerId });
    return {
      chainItem: chain,
      isTestnet: !!chain?.isTestnet,
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

  const isSwapOrBridge = useMemo(
    () => ['bridgeFrom', 'swapFrom', 'swapTo'].includes(type),
    [type]
  );

  const swapAndBridgeNoDataTip = useMemo(() => {
    if (isSwapOrBridge) {
      return (
        <div className="no-token w-full">
          <RcIconMatchCC
            className="w-[32px] h-[32px] text-r-neutral-foot"
            viewBox="0 0 33 32"
          />

          <p className="text-r-neutral-foot text-14 mt-8 text-center mb-0">
            {t('component.TokenSelector.noTokens')}
          </p>
        </div>
      );
    }
    return null;
  }, [isSwapOrBridge]);

  const NoDataUI = useMemo(
    () =>
      isLoading ? (
        <div>
          {Array(isSwapType ? 8 : 10)
            .fill(1)
            .map((_, i) => (
              <DefaultLoading key={i} type={type} />
            ))}
        </div>
      ) : isSwapOrBridge ? (
        <>{swapAndBridgeNoDataTip}</>
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
            <p className="text-r-neutral-foot text-14 mt-12 text-center mb-0">
              {t('component.TokenSelector.noTokens')}
            </p>
          ) : (
            <>
              <p className="text-r-neutral-foot text-14 mt-12 text-center mb-0">
                {t('component.TokenSelector.noMatch')}
              </p>
              <p className="text-r-neutral-foot text-14 mt-0 text-center">
                {/* Try to search contract address on {{ chainName }} */}
                {t('component.TokenSelector.noMatchSuggestion', {
                  chainName:
                    findChain({
                      serverId: chainServerId,
                    })?.name || 'chain',
                })}
              </p>
            </>
          )}
        </div>
      ),
    [
      isLoading,
      isSwapType,
      t,
      isSearchAddr,
      chainServerId,
      swapAndBridgeNoDataTip,
      type,
      isSwapOrBridge,
    ]
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

  const swapAndBridgeHeader = React.useMemo(() => {
    if (isSwapOrBridge) {
      return (
        <li
          className={clsx(
            'token-list__header h-auto mb-0',
            type === 'swapFrom' && 'mt-14'
          )}
        >
          <div>
            {type === 'swapTo'
              ? t('component.TokenSelector.hot')
              : t('component.TokenSelector.bridge.token')}
          </div>
          <div />
          <div>{t('component.TokenSelector.bridge.value')}</div>
        </li>
      );
    }
    return (
      <li className="token-list__header">
        <div>
          {/* ASSET / AMOUNT */}
          {t('component.TokenSelector.listTableHead.assetAmount.title')}
        </div>
        <div>
          {/* PRICE */}
          {t('component.TokenSelector.listTableHead.price.title')}
        </div>
        <div>
          {/* USD VALUE */}
          {t('component.TokenSelector.listTableHead.usdValue.title')}
        </div>
      </li>
    );
  }, [isSwapOrBridge, type, t]);

  const SwapToTokenRecenterHeader = React.useMemo(
    () => (
      <li className="token-list__header h-auto mb-0">
        <div>{t('component.TokenSelector.recent')}</div>
        <div />
        <div />
      </li>
    ),
    [t]
  );

  const swapAndBridgeItemRender = React.useCallback(
    (token: TokenItem, _type: typeof type, updateToken?: boolean) => {
      if (!visible && updateToken) {
        return null;
      }
      return (
        <SwapAndBridgeTokenItem
          key={`${token.chain}-${token.id}`}
          disabledTips={disabledTips}
          onConfirm={onConfirm}
          token={token}
          type={_type}
          supportChains={supportChains}
          updateToken={updateToken}
        />
      );
    },
    [disabledTips, onConfirm, supportChains, visible]
  );

  const recentToTokens = useRabbySelector((s) => s.swap.recentToTokens || []);

  const recentDisplayToTokens = useMemo(() => {
    if (type === 'swapTo' && query.length < 1) {
      return recentToTokens.filter((item) => {
        return (
          item.chain === chainServerId && !excludeTokens?.includes(item.id)
        );
      });
    }
    return [];
  }, [chainServerId, recentToTokens, type, query, excludeTokens]);

  return (
    <Drawer
      className="token-selector custom-popup is-support-darkmode"
      height={drawerHeight}
      placement="bottom"
      visible={visible}
      onClose={onCancel}
      closeIcon={
        <RcIconCloseCC className="w-[20px] h-[20px] text-r-neutral-foot" />
      }
      getContainer={getContainer}
    >
      {/* Select a token */}
      <div className="header">{t('component.TokenSelector.header.title')}</div>
      <div className="input-wrapper">
        <Input
          className={clsx({ active: isInputActive })}
          size="large"
          prefix={<img src={IconSearch} />}
          // Search by Name / Address
          placeholder={
            placeholder ?? t('component.TokenSelector.searchInput.placeholder')
          }
          allowClear
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          autoFocus
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
      </div>
      <div className="filters-wrapper">
        {chainItem && !['swapTo', 'bridgeFrom'].includes(type) && (
          <>
            <div className="filter-item__chain px-10">
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
                <RcIconChainFilterCloseCC
                  viewBox="0 0 16 16"
                  className="filter-item__chain-close w-[16px] h-[16px] ml-[2px] text-r-neutral-body hover:text-r-red-default"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {!isTestnet ? (
        <ul className={clsx('token-list', { empty: isEmpty })}>
          {recentDisplayToTokens.length ? (
            <div className="mb-10">
              {SwapToTokenRecenterHeader}
              <div className={clsx('flex flex-wrap gap-12', 'py-8 px-20')}>
                {recentDisplayToTokens.map((token) => (
                  <div
                    key={token.id}
                    className={clsx(
                      'flex items-center justify-center gap-6',
                      'cursor-pointer py-8 px-12 rounded-[8px]',
                      'bg-r-neutral-card2 hover:bg-r-blue-light-2',
                      'text-15 text-r-neutral-title1 font-medium'
                    )}
                    onClick={() => onConfirm(token)}
                  >
                    <TokenWithChain
                      token={token}
                      width="20px"
                      height="20px"
                      chainClassName="-top-4 -right-4"
                    />

                    <span>{getTokenSymbol(token)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {swapAndBridgeHeader}
          {isEmpty
            ? NoDataUI
            : displayList.map((token) => {
                if (isSwapOrBridge) {
                  return swapAndBridgeItemRender(token, type);
                }
                const chainItem = findChain({ serverId: token.chain });
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
                            className="symbol text-13 text-r-neutral-title-1 font-medium"
                            title={token.amount.toString()}
                          >
                            {formatTokenAmount(token.amount)}
                          </span>
                          <span
                            className="symbol"
                            title={getTokenSymbol(token)}
                          >
                            {getTokenSymbol(token)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div>{formatUsdValue(token.price)}</div>
                        <div>
                          {isNil(token.price_24h_change) ? null : (
                            <div
                              className={clsx('font-normal', {
                                'text-green': token.price_24h_change > 0,
                                'text-red-forbidden':
                                  token.price_24h_change < 0,
                              })}
                            >
                              {token.price_24h_change > 0 ? '+' : ''}
                              {(token.price_24h_change * 100).toFixed(2)}%
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col text-right items-end">
                        <div
                          title={formatUsdValue(
                            new BigNumber(token.price || 0)
                              .times(token.amount)
                              .toFixed()
                          )}
                          className={clsx(
                            'max-w-full text-13 text-r-neutral-title-1',
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
      ) : (
        <ul className={clsx('token-list', { empty: isEmpty })}>
          <li className="token-list__header">
            <div>ASSET</div>
            <div>Amount</div>
          </li>
          {isEmpty
            ? NoDataUI
            : displayList.map((token) => {
                const chainItem = findChain({ serverId: token.chain });
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
                      <div className="flex items-center gap-[12px]">
                        <TokenWithChain
                          token={token}
                          width="24px"
                          height="24px"
                          hideConer
                        />
                        <div
                          className="text-r-neutral-title1 text-[13px] leading-[15px] font-medium"
                          title={getTokenSymbol(token)}
                        >
                          {getTokenSymbol(token)}
                        </div>
                      </div>

                      <div
                        title={formatTokenAmount(token.amount)}
                        className={clsx(
                          'max-w-full text-r-neutral-title1 text-[13px] leading-[15px] font-medium',
                          'truncate text-right ml-auto w-[150px]'
                        )}
                      >
                        {formatTokenAmount(token.amount)}
                      </div>
                    </li>
                  </Tooltip>
                );
              })}
        </ul>
      )}
    </Drawer>
  );
};

const DefaultLoading = ({ type }: { type: TokenSelectorProps['type'] }) => (
  <div className="flex justify-between items-center py-10 pl-[20px] pr-[17px]">
    <div className="gap-x-12 flex">
      <Skeleton.Input
        active
        className="rounded-full w-[24px] h-[24px] bg-r-neutral-bg-1"
      />
      <div className="gap-y-2 flex flex-col">
        <Skeleton.Input
          active
          className="bg-r-neutral-bg-1 rounded-[2px] w-[72px] h-[15px]"
        />
        <Skeleton.Input
          active
          className="bg-r-neutral-bg-1 rounded-[2px] w-[44px] h-[10px]"
        />
      </div>
    </div>
    <div>
      {!([
        'bridgeFrom',
        'swapFrom',
        'swapTo',
      ] as TokenSelectorProps['type'][]).includes(type) && (
        <Skeleton.Input
          active
          className="bg-r-neutral-bg-1 rounded-[2px] w-[72px] h-[20px]"
        />
      )}
    </div>
    <div>
      <Skeleton.Input
        active
        className="bg-r-neutral-bg-1 rounded-[2px] w-[72px] h-[20px]"
      />
    </div>
  </div>
);

function SwapAndBridgeTokenItem(props: {
  token: TokenItem;
  disabledTips?: React.ReactNode;
  disabled?: boolean;
  onConfirm: (token: TokenItem) => void;
  updateToken?: boolean;
  supportChains?: CHAINS_ENUM[];
  type: TokenSelectorProps['type'];
}) {
  const {
    token,
    disabledTips,
    supportChains,
    onConfirm,
    updateToken,
    type,
  } = props;

  const wallet = useWallet();

  const currentAccount = useCurrentAccount();

  const chainItem = useMemo(() => findChain({ serverId: token.chain }), [
    token,
  ]);

  const currentChainName = useMemo(() => chainItem?.name, [chainItem]);

  const disabled = useMemo(() => {
    if (type === 'swapTo') {
      return false;
    }
    return (
      (!!supportChains?.length &&
        !!chainItem &&
        !supportChains.includes(chainItem.enum)) ||
      new BigNumber(token?.raw_amount_hex_str || token.amount || 0).lte(0)
    );
  }, []);

  const { value, loading, error } = useAsync(async () => {
    if (updateToken && currentAccount?.address) {
      const data = await wallet.openapi.getToken(
        currentAccount?.address,
        token.chain,
        token.id
      );
      return data;
    }
    return token;
  }, [currentAccount?.address, updateToken, token?.chain, token?.id]);

  return (
    <Tooltip
      trigger={['click', 'hover']}
      mouseEnterDelay={3}
      overlayClassName={clsx('rectangle')}
      placement="top"
      title={disabledTips}
      visible={disabled ? undefined : false}
      align={{ targetOffset: [0, -30] }}
    >
      <li
        className={clsx('token-list__item h-[56px]', disabled && 'opacity-50')}
        onClick={() => !disabled && onConfirm(value || token)}
      >
        <div>
          <TokenWithChain
            token={value || token}
            width="28px"
            height="28px"
            hideConer
          />
          <div className="flex flex-col gap-1">
            <span className="symbol text-14 text-r-neutral-title-1 font-medium">
              {getTokenSymbol(token)}
            </span>
            <span className="symbol text-13 font-normal text-r-neutral-foot">
              {currentChainName}
            </span>
          </div>
        </div>

        <div className="flex flex-col"></div>

        <div className="flex flex-col text-right items-end">
          <div className={clsx('text-14 text-r-neutral-title-1 font-medium')}>
            {formatTokenAmount(value?.amount || 0)}
          </div>
          <div className="text-13 font-normal text-r-neutral-foot">
            {formatUsdValue(
              new BigNumber(value?.price || 0)
                .times(value?.amount || 0)
                .toFixed()
            )}
          </div>
        </div>
      </li>
    </Tooltip>
  );
}

export default TokenSelector;
