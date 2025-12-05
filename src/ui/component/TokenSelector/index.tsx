/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Input,
  Drawer,
  Skeleton,
  Tooltip,
  DrawerProps,
  Modal,
  Button,
} from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useAsync, useDebounce } from 'react-use';
import TokenWithChain from '../TokenWithChain';
import { TokenItem, TokenItemWithEntity } from 'background/service/openapi';
import {
  formatPrice,
  formatTokenAmount,
  formatUsdValue,
} from 'ui/utils/number';
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
import { ReactComponent as RcIconMatchCC } from '@/ui/assets/match-cc.svg';
import { ReactComponent as AssetEmptySVG } from '@/ui/assets/dashboard/asset-empty.svg';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/riskWarning-cc.svg';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { getUiType, useWallet } from '@/ui/utils';
import { useRabbySelector } from '@/ui/store';
import { TooltipWithMagnetArrow } from '../Tooltip/TooltipWithMagnetArrow';
import { ReactComponent as RcIconInfoCC } from '@/ui/assets/info-cc.svg';
import { ExternalTokenRow } from './ExternalToken';
import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';
import { TokenDetailInTokenSelectProviderContext } from './context';
import NetSwitchTabs, {
  useSwitchNetTab,
} from 'ui/component/PillsSwitch/NetSwitchTabs';
import { useSearchTestnetToken } from '@/ui/hooks/useSearchTestnetToken';
import { useHistory } from 'react-router-dom';
import { ExchangeLogos } from './CexLogos';
import { ChainMatrixLine } from './ChainMatrixLine';

const isTab = getUiType().isTab;

export const isSwapTokenType = (s: string) =>
  ['swapFrom', 'swapTo'].includes(s);

export interface SearchCallbackCtx {
  chainServerId: Chain['serverId'] | null;
  // chainItem: Chain | null | undefined;
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
  onStartSelectChain?: () => void;
  type?: 'default' | 'swapFrom' | 'swapTo' | 'bridgeFrom' | 'bridgeTo' | 'send';
  placeholder?: string;
  chainId?: string;
  disabledTips?: React.ReactNode;
  supportChains?: CHAINS_ENUM[] | undefined;
  drawerHeight?: number | string;
  excludeTokens?: TokenItem['id'][];
  getContainer?: DrawerProps['getContainer'];
  showCustomTestnetAssetList?: boolean;
  disableItemCheck?: (
    token: TokenItem
  ) => {
    disable: boolean;
    reason: string;
    shortReason: string;
  };
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
  onStartSelectChain,
  isLoading = false,
  type = 'default',
  placeholder,
  chainId: chainServerId,
  disabledTips,
  supportChains,
  drawerHeight = '540px',
  excludeTokens = defaultExcludeTokens,
  getContainer,
  disableItemCheck,
  showCustomTestnetAssetList,
}: TokenSelectorProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isInputActive, setIsInputActive] = useState(false);
  const history = useHistory();

  const { currentAccount } = useRabbySelector((s) => ({
    currentAccount: s.account.currentAccount,
  }));

  const { chainItem, isTestnet } = useMemo(() => {
    const chain = !chainServerId
      ? null
      : findChain({ serverId: chainServerId });
    return {
      chainItem: chain,
      isTestnet: !!chain?.isTestnet,
    };
  }, [chainServerId]);

  const [tokenDetailOpen, setTokenDetailOpen] = useState(false);
  const [tokenDetail, setTokenDetail] = useState<TokenItemWithEntity>();

  useDebounce(
    () => {
      onSearch({
        chainServerId: /* type === 'send' ? '' :  */ chainServerId || '',
        // chainItem: chainItem,
        keyword: query,
      });
    },
    150,
    [chainItem, query]
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
  };

  const { selectedTab, onTabChange } = useSwitchNetTab();

  const {
    testnetTokenList: customTestnetTokenList,
    loading: customTestnetTokenListLoading,
    hasData: hasCustomTestnetTokenData,
  } = useSearchTestnetToken({
    address: currentAccount?.address,
    q: query,
    withBalance: true,
    enabled: showCustomTestnetAssetList && visible,
  });

  useEffect(() => {
    if (!visible) {
      onTabChange('mainnet');
    }
  }, [visible, onTabChange]);

  const emptyTestnetTokenList = useMemo(() => {
    return (
      showCustomTestnetAssetList &&
      selectedTab === 'testnet' &&
      customTestnetTokenList?.length === 0 &&
      !query &&
      !customTestnetTokenListLoading
    );
  }, [
    customTestnetTokenList,
    showCustomTestnetAssetList,
    selectedTab,
    query,
    customTestnetTokenListLoading,
  ]);

  const displayList = useMemo(() => {
    if (showCustomTestnetAssetList && selectedTab === 'testnet') {
      return customTestnetTokenList || [];
    }

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
  }, [
    list,
    supportChains,
    chainServerId,
    selectedTab,
    showCustomTestnetAssetList,
    customTestnetTokenList,
  ]);

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

  const isEmpty = useMemo(() => {
    if (showCustomTestnetAssetList && selectedTab === 'testnet') {
      return customTestnetTokenList?.length <= 0;
    }
    return list.length <= 0;
  }, [list, showCustomTestnetAssetList, selectedTab, customTestnetTokenList]);

  const isSwapType = isSwapTokenType(type);

  const isSearchAddr = useMemo(() => {
    const v = query?.trim() || '';
    return v.length === 42 && v.toLowerCase().startsWith('0x');
  }, [query]);

  const isSwapOrBridge = useMemo(
    () => ['bridgeFrom', 'bridgeTo', 'swapFrom', 'swapTo'].includes(type),
    [type]
  );

  const showChainFilter = useMemo(() => {
    return !['swapTo', 'bridgeTo', 'send'].includes(type);
  }, [type]);

  const showChainFilterV2 = useMemo(() => {
    return ['send'].includes(type) && selectedTab !== 'testnet';
  }, [type, selectedTab]);

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
  }, [isSwapOrBridge, t]);

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
      query,
    ]
  );

  useEffect(() => {
    if (query && isSwapType && displayList.length === 0) {
      stats.report('swapTokenSearchFailure', {
        chainId: chainServerId || '',
        searchType: type === 'swapFrom' ? 'fromToken' : 'toToken',
        keyword: query,
      });
    }
  }, [type, query, isSwapType, displayList, chainServerId]);

  const CommonHeader = React.useMemo(() => {
    if (type === 'bridgeTo') {
      return (
        <li className={clsx('token-list__header')}>
          <div>{t('component.TokenSelector.bridge.token')}</div>
          <div />
          <div className="flex items-center justify-end relative">
            <span>{t('component.TokenSelector.bridge.liquidity')}</span>
            <TooltipWithMagnetArrow
              placement="top"
              className="rectangle w-[max-content]"
              title={t('component.TokenSelector.bridge.liquidityTips')}
            >
              <RcIconInfoCC className="w-12 h-12 ml-2" viewBox="0 0 14 14" />
            </TooltipWithMagnetArrow>
          </div>
        </li>
      );
    }
    return null;
  }, [type, t]);

  const isSwapTo = type === 'swapTo';
  const isBridgeTo = type === 'bridgeTo';

  const tokenDetailsTips = useMemo(() => {
    if (isSwapTo || isBridgeTo || !tokenDetail) {
      return;
    }
    const chainItem = findChainByServerID(tokenDetail?.chain);
    const isDisabled =
      !!supportChains?.length &&
      ((!!chainItem && !supportChains.includes(chainItem.enum)) || !chainItem);
    return isDisabled
      ? t('component.TokenSelector.chainNotSupport')
      : undefined;
  }, [tokenDetail, supportChains, isBridgeTo, isSwapTo, t]);

  const commonItemRender = React.useCallback(
    (
      token: TokenItem,
      _type: typeof type,
      updateToken?: boolean,
      checkItem?: (
        token: TokenItem
      ) => {
        disable: boolean;
        reason: string;
        shortReason: string;
      }
    ) => {
      if (!visible && updateToken) {
        return null;
      }
      const { disable, shortReason } = checkItem?.(token) || {};
      return (
        <CommonTokenItem
          key={`${token.chain}-${token.id}`}
          onConfirm={onConfirm}
          warningText={disable ? shortReason : undefined}
          token={token}
          type={_type}
          hideUsdValue={showCustomTestnetAssetList && selectedTab === 'testnet'}
          supportChains={supportChains}
          updateToken={updateToken}
          openTokenDetail={() => {
            setTokenDetail(token);
            setTokenDetailOpen(true);
          }}
        />
      );
    },
    [onConfirm, supportChains, visible, showCustomTestnetAssetList, selectedTab]
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

  const handleInTokenDetails = useCallback(
    (token: TokenItemWithEntity) => {
      onConfirm(token);
    },
    [onConfirm]
  );

  return (
    <TokenDetailInTokenSelectProviderContext.Provider
      value={handleInTokenDetails}
    >
      <Drawer
        className="token-selector custom-popup is-support-darkmode is-new"
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
        <div className="header">
          {t('component.TokenSelector.header.title')}
        </div>
        {showCustomTestnetAssetList && hasCustomTestnetTokenData && (
          <NetSwitchTabs value={selectedTab} onTabChange={onTabChange} />
        )}
        <div
          className={clsx(
            'mt-[120px]',
            emptyTestnetTokenList ? 'block' : 'hidden'
          )}
        >
          <AssetEmptySVG className="m-auto" />
          <div>
            <div className="mt-0 text-r-neutral-foot text-[14px] text-center">
              {t('page.dashboard.assets.noTestnetAssets')}
            </div>
            <div className="text-center mt-[50px]">
              <Button
                type="primary"
                onClick={() => {
                  onCancel?.();
                  history.push('/custom-testnet');
                }}
                className="w-[200px] h-[44px]"
              >
                {t('component.ChainSelectorModal.addTestnet')}
              </Button>
            </div>
          </div>
        </div>

        <div
          className={clsx(
            'input-wrapper',
            emptyTestnetTokenList ? 'hidden' : 'block'
          )}
        >
          <Input
            className={clsx({ active: isInputActive }, 'bg-r-neutral-card2')}
            size="large"
            prefix={<img src={IconSearch} />}
            // Search by Name / Address
            placeholder={
              placeholder ??
              t('component.TokenSelector.searchInput.placeholder')
            }
            allowClear
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            autoFocus={!isTab}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>
        {chainItem && showChainFilter && (
          <div className="filters-wrapper">
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
                  onRemoveChainFilter?.({
                    chainServerId: chainServerId || '',
                    // chainItem,
                  });
                  onSearch({
                    // chainItem: null,
                    chainServerId: '',
                    keyword: query,
                  });
                }}
              >
                <RcIconChainFilterCloseCC
                  viewBox="0 0 16 16"
                  className="filter-item__chain-close w-[16px] h-[16px] ml-[2px] text-r-neutral-foot hover:text-r-red-default"
                />
              </div>
            </div>
          </div>
        )}
        {showChainFilterV2 && (
          <div className="filters-wrapper">
            <ChainMatrixLine
              selectedChain={chainItem}
              onStartSelectChain={onStartSelectChain}
              onClearFilterChain={() => {
                onRemoveChainFilter?.({
                  chainServerId: chainServerId || '',
                  // chainItem,
                });
                onSearch({
                  // chainItem: null,
                  chainServerId: '',
                  keyword: query,
                });
              }}
            />
          </div>
        )}

        {!isTestnet ? (
          <ul className={clsx('token-list', { empty: isEmpty })}>
            {recentDisplayToTokens.length ? (
              <div className="mb-12">
                <div className={clsx('flex flex-wrap gap-12', 'px-20')}>
                  {recentDisplayToTokens.map((token) => (
                    <div
                      key={token.id}
                      className={clsx(
                        'flex items-center justify-center gap-6',
                        'cursor-pointer py-8 px-12 rounded-[8px]',
                        'bg-r-neutral-card1 hover:bg-r-blue-light-1',
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

            {CommonHeader}
            {isEmpty
              ? NoDataUI
              : displayList.map((token) => {
                  return commonItemRender(
                    token,
                    type,
                    undefined,
                    disableItemCheck
                  );
                })}
          </ul>
        ) : (
          <ul className={clsx('token-list', { empty: isEmpty })}>
            <li className="token-list__header">
              <div>Token</div>
              <div>Value</div>
            </li>
            {isEmpty
              ? NoDataUI
              : displayList.map((token) => {
                  return commonItemRender(
                    token,
                    type,
                    undefined,
                    disableItemCheck
                  );
                })}
          </ul>
        )}
      </Drawer>
      <TokenDetailPopup
        variant="add"
        visible={tokenDetailOpen}
        onClose={() => {
          setTokenDetailOpen(false);
        }}
        token={tokenDetail}
        tipsFromTokenSelect={tokenDetailsTips}
      />
    </TokenDetailInTokenSelectProviderContext.Provider>
  );
};

const DefaultLoading = ({ type }: { type: TokenSelectorProps['type'] }) => (
  <div className="flex justify-between items-center py-10 pl-[20px] pr-[17px] bg-r-neutral-card1 mx-16 rounded mt-8">
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
    <div></div>
    <div>
      <Skeleton.Input
        active
        className="bg-r-neutral-bg-1 rounded-[2px] w-[72px] h-[20px]"
      />
    </div>
  </div>
);

function CommonTokenItem(props: {
  token: TokenItem & {
    trade_volume_level?: 'low' | 'high';
  };
  disabledTips?: React.ReactNode;
  disabled?: boolean;
  warningText?: string;
  onConfirm: (token: TokenItem) => void;
  updateToken?: boolean;
  supportChains?: CHAINS_ENUM[];
  type: TokenSelectorProps['type'];
  openTokenDetail: () => void;
  hideUsdValue?: boolean;
}) {
  const {
    token,
    disabledTips,
    supportChains,
    disabled: disabledFromProps,
    warningText,
    onConfirm,
    updateToken,
    type,
    openTokenDetail,
    hideUsdValue,
  } = props;

  const { t } = useTranslation();

  const wallet = useWallet();

  const currentAccount = useCurrentAccount();

  const chainItem = useMemo(() => findChain({ serverId: token.chain }), [
    token?.chain,
  ]);

  const isSwapTo = type === 'swapTo';
  const isBridgeTo = type === 'bridgeTo';

  const currentChainName = useMemo(() => chainItem?.name, [chainItem]);

  const onClickTokenSymbol: React.MouseEventHandler<HTMLSpanElement> = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      openTokenDetail();
    },
    [openTokenDetail]
  );

  const disabled = useMemo(() => {
    if (isSwapTo || isBridgeTo) {
      return false;
    }

    return (
      !!supportChains?.length &&
      ((!!chainItem && !supportChains.includes(chainItem.enum)) || !chainItem)
    );
  }, [isSwapTo, isBridgeTo, supportChains, chainItem]);

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

  const tips = useMemo(() => {
    return disabled ? t('component.TokenSelector.chainNotSupport') : undefined;
  }, [disabled, t]);

  const showExchangeLogos = useMemo(() => {
    return isBridgeTo && !!token.cex_ids?.length;
  }, [isBridgeTo, token.cex_ids]);

  const handleTokenPress = useCallback(() => {
    if (disabled) {
      return;
    }
    onConfirm(value || token);
  }, [disabled, value, token, onConfirm]);

  if (type === 'swapTo') {
    return (
      <Tooltip
        trigger={['click', 'hover']}
        mouseEnterDelay={3}
        overlayClassName={clsx('rectangle')}
        placement="top"
        title={tips}
        visible={disabled ? undefined : false}
        align={{ targetOffset: [0, -30] }}
      >
        <ExternalTokenRow
          data={token}
          onTokenPress={handleTokenPress}
          onClickTokenSymbol={onClickTokenSymbol}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip
      trigger={['click', 'hover']}
      mouseEnterDelay={3}
      overlayClassName={clsx('rectangle')}
      placement="top"
      title={tips}
      visible={disabled ? undefined : false}
      align={{ targetOffset: [0, -30] }}
    >
      <li
        className={clsx(
          'token-list__item',
          (disabledFromProps || disabled) && 'token-disabled',
          {
            'opacity-80': !!warningText,
          }
        )}
        onClick={handleTokenPress}
      >
        <div className="token-info">
          <div>
            <TokenWithChain
              token={value || token}
              width="32px"
              height="32px"
              hideConer
            />
            <div className="flex flex-col">
              {showExchangeLogos ? (
                <div className="flex overflow-visible">
                  <span
                    className="symbol_click overflow-visible"
                    onClick={onClickTokenSymbol}
                  >
                    {getTokenSymbol(token)}
                  </span>
                  <ExchangeLogos cexIds={token.cex_ids || []} />
                </div>
              ) : (
                <span className="symbol_click" onClick={onClickTokenSymbol}>
                  {getTokenSymbol(token)}
                </span>
              )}
              <span className="symbol text-13 font-normal text-r-neutral-foot mb-2">
                {isSwapTo
                  ? `$${formatPrice(token.price || 0)}`
                  : currentChainName}
              </span>
            </div>
          </div>

          <div className="flex flex-col"></div>

          <div className="flex flex-col text-right items-end">
            {isBridgeTo ? (
              <div
                className={clsx(
                  'flex items-center justify-center gap-4',
                  'py-2 px-8 rounded-full',
                  'text-13 font-normal',
                  token.trade_volume_level === 'high'
                    ? 'bg-r-green-light'
                    : 'bg-r-orange-light',
                  token.trade_volume_level === 'high'
                    ? 'text-r-green-default'
                    : 'text-r-orange-default'
                )}
              >
                <div
                  className={clsx(
                    'w-[3px] h-[3px] rounded-full',
                    token.trade_volume_level === 'high'
                      ? 'bg-r-green-default'
                      : 'bg-r-orange-default'
                  )}
                />
                <span>
                  {token?.trade_volume_level === 'high'
                    ? t('component.TokenSelector.bridge.high')
                    : t('component.TokenSelector.bridge.low')}
                </span>
              </div>
            ) : !hideUsdValue ? (
              <>
                <div className={clsx('token_usd_value')}>
                  {formatUsdValue(
                    new BigNumber(value?.price || 0)
                      .times(value?.amount || 0)
                      .toFixed()
                  )}
                </div>
                <div className="text-13 font-normal text-r-neutral-foot mb-2">
                  {formatTokenAmount(value?.amount || 0)}
                </div>
              </>
            ) : (
              <div className={clsx('token_usd_value')}>
                {formatTokenAmount(value?.amount || 0)}
              </div>
            )}
          </div>
        </div>
        {!!warningText && (
          <div
            className={`
            gap-2 rounded-[4px] bg-r-red-light
            h-[31px] mt-[-2px] mb-16
            flex justify-center items-center`}
          >
            <div className="text-r-red-default">
              <RcIconWarningCC />
            </div>
            <span className="text-[13px] font-medium text-r-red-default">
              {warningText}
            </span>
          </div>
        )}
      </li>
    </Tooltip>
  );
}

export default TokenSelector;
