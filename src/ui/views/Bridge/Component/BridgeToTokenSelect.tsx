import React, { useMemo, useState, useEffect } from 'react';
import { Drawer, Input, Skeleton, Tooltip } from 'antd';
import { TokenItem } from 'background/service/openapi';
import { getTokenSymbol } from 'ui/utils/token';
import styled from 'styled-components';
import LessPalette, { ellipsis } from '@/ui/style/var-defs';
import { ReactComponent as SvgIconArrowDownTriangle } from '@/ui/assets/swap/arrow-caret-down2.svg';
import { useRabbySelector } from '@/ui/store';
import { uniqBy } from 'lodash';
import { CHAINS_ENUM } from '@/constant';
import useSortToken from '@/ui/hooks/useSortTokens';
import { useAsync, useDebounce } from 'react-use';
import { formatPrice, useWallet } from '@/ui/utils';
import { TokenWithChain } from '@/ui/component';

import { ReactComponent as RcIconMatchCC } from '@/ui/assets/match-cc.svg';
import IconSearch from 'ui/assets/search.svg';
import { ReactComponent as RcIconCloseCC } from '@/ui/assets/component/close-cc.svg';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { findChain, findChainByServerID } from '@/utils/chain';
import { ReactComponent as RcIconInfoCC } from '@/ui/assets/info-cc.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

const Wrapper = styled.div`
  background-color: transparent;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;

  & .ant-input {
    background-color: transparent;
    border-color: transparent;
    color: #161819;
    flex: 1;
    font-weight: 500;
    font-size: 22px;
    line-height: 26px;

    text-align: right;
    color: #13141a;
    padding-right: 0;

    &:placeholder {
      color: #707280;
    }
  }
`;

const Text = styled.span`
  font-weight: 500;
  font-size: 20px;
  line-height: 23px;
  color: ${LessPalette['@color-title']};
  max-width: 100px;
  ${ellipsis()}
`;

export interface TokenSelectProps {
  type: 'from' | 'to';
  fromChainId?: string;
  fromTokenId?: string;
  token?: TokenItem;
  onChange?(amount: string): void;
  onTokenChange(token: TokenItem): void;
  chainId?: string;
  excludeTokens?: TokenItem['id'][];
  placeholder?: string;
  hideChainIcon?: boolean;
  value?: string;
  loading?: boolean;
  tokenRender?:
    | (({
        token,
        openTokenModal,
      }: {
        token?: TokenItem;
        openTokenModal: () => void;
      }) => React.ReactNode)
    | React.ReactNode;
  drawerHeight?: string | number;
}

const defaultExcludeTokens = [];

const BridgeToTokenSelect = ({
  fromChainId,
  fromTokenId,
  type,
  token,
  onChange,
  onTokenChange,
  chainId,
  excludeTokens = defaultExcludeTokens,
  placeholder,
  hideChainIcon = true,
  value,
  loading = false,
  tokenRender,
  drawerHeight,
}: TokenSelectProps) => {
  const [queryConds, setQueryConds] = useState({
    keyword: '',
  });
  const [tokenSelectorVisible, setTokenSelectorVisible] = useState(false);
  const currentAccount = useRabbySelector(
    (state) => state.account.currentAccount
  );
  const wallet = useWallet();

  const supportChains = useRabbySelector((s) => s.bridge.supportedChains);

  const handleCurrentTokenChange = (token: TokenItem) => {
    onChange && onChange('');
    onTokenChange(token);
    setTokenSelectorVisible(false);

    setQueryConds((prev) => ({ ...prev }));
  };

  const handleTokenSelectorClose = () => {
    setTokenSelectorVisible(false);

    setQueryConds((prev) => ({
      ...prev,
    }));
  };

  const handleSelectToken = () => {
    setTokenSelectorVisible(true);
  };

  const { value: tokenList, loading: tokenListLoading } = useAsync(async () => {
    if (fromChainId && chainId) {
      const list = await wallet.openapi.getBridgeToTokenList({
        from_chain_id: fromChainId,
        from_token_id: fromTokenId,
        to_chain_id: chainId,
        q: queryConds.keyword,
      });
      return list?.token_list;
    }
    return [];
  }, [currentAccount, chainId, tokenSelectorVisible, queryConds.keyword]);

  const allDisplayTokens = useMemo(() => {
    return tokenList;
  }, [tokenList]);

  const availableToken = useMemo(() => {
    const allTokens = allDisplayTokens;
    return uniqBy(allTokens, (token) => {
      return `${token.chain}-${token.id}`;
    }).filter((e) => !excludeTokens.includes(e.id));
  }, [allDisplayTokens, excludeTokens, queryConds]);

  const displayTokenList = useSortToken(availableToken);

  const isListLoading = tokenListLoading;

  const handleSearchTokens = React.useCallback(async (keyword) => {
    setQueryConds({
      keyword,
    });
  }, []);

  const [input, setInput] = useState('');

  const handleInput: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value;
    if (!/^\d*(\.\d*)?$/.test(v)) {
      return;
    }
    setInput(v);
    onChange && onChange(v);
  };

  useEffect(() => {
    setQueryConds((prev) => ({
      ...prev,
      chainServerId: chainId,
    }));
  }, [chainId]);

  if (tokenRender) {
    return (
      <>
        {typeof tokenRender === 'function'
          ? tokenRender?.({ token, openTokenModal: handleSelectToken })
          : tokenRender}
        {chainId && (
          <TokenSelector
            height={drawerHeight}
            visible={tokenSelectorVisible}
            list={displayTokenList}
            onConfirm={handleCurrentTokenChange}
            onCancel={handleTokenSelectorClose}
            onSearch={handleSearchTokens}
            isLoading={isListLoading}
            placeholder={placeholder}
            chainId={chainId}
            disabledTips={'Not supported'}
            supportChains={supportChains}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Wrapper>
        <div onClick={handleSelectToken}>
          {token ? (
            <TokenWrapper>
              <TokenWithChain
                width="24px"
                height="24px"
                token={token}
                hideConer
                hideChainIcon={hideChainIcon}
              />
              <Text title={getTokenSymbol(token)}>{getTokenSymbol(token)}</Text>
              <SvgIconArrowDownTriangle className="ml-[3px]" />
            </TokenWrapper>
          ) : (
            <SelectTips>
              <span>Select Token</span>
              <SvgIconArrowDownTriangle className="brightness-[100] ml-[7px]" />
            </SelectTips>
          )}
        </div>
        {loading ? (
          <Skeleton.Input
            active
            style={{
              width: 110,
              height: 20,
            }}
          />
        ) : (
          <Input
            className="h-[30px] max-w-"
            readOnly={type === 'to'}
            placeholder={'0'}
            autoFocus={type !== 'to'}
            autoCorrect="false"
            autoComplete="false"
            value={value ?? input}
            onChange={type !== 'to' ? handleInput : undefined}
          />
        )}
      </Wrapper>
      <TokenSelector
        height={drawerHeight}
        visible={tokenSelectorVisible}
        list={displayTokenList}
        onConfirm={handleCurrentTokenChange}
        onCancel={handleTokenSelectorClose}
        onSearch={handleSearchTokens}
        isLoading={isListLoading}
        // type={type}
        placeholder={placeholder}
        chainId={chainId}
        disabledTips={'Not supported'}
        supportChains={supportChains}
      />
    </>
  );
};

const TokenWrapper = styled.div`
  /* width: 92px; */
  /* height: 30px; */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 4px;
  border-radius: 4px;
  &:hover {
    background: rgba(134, 151, 255, 0.3);
  }
`;

const SelectTips = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 150px;
  height: 32px;
  color: #fff;
  background: var(--r-blue-default, #7084ff);
  border-radius: 4px;
  font-weight: 500;
  font-size: 20px;
  line-height: 23px;
  & svg {
    margin-left: 4px;
    filter: brightness(1000);
  }
`;

export interface TokenSelectorProps {
  visible: boolean;
  list: TokenItem[];
  isLoading?: boolean;
  onConfirm(item: TokenItem): void;
  onCancel(): void;
  placeholder?: string;
  chainId?: string;
  disabledTips?: string;
  supportChains?: CHAINS_ENUM[] | undefined;
  itemRender?: (
    token: TokenItem,
    supportChains?: CHAINS_ENUM[]
  ) => React.ReactNode;
  onSearch: (q: string) => void;
  height?: number | string;
}

const TokenSelector = ({
  visible,
  list,
  onConfirm,
  onCancel,
  onSearch,
  isLoading = false,
  placeholder,
  chainId: chainServerId,
  disabledTips,
  supportChains,
  itemRender,
  height = '580px',
}: TokenSelectorProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isInputActive, setIsInputActive] = useState(false);

  useDebounce(
    () => {
      onSearch(query);
    },
    150,
    [query]
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
  };

  const displayList = useMemo(() => {
    return list || [];
  }, [list]);

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

  const isSearchAddr = useMemo(() => {
    const v = query?.trim() || '';
    return v.length === 42 && v.toLowerCase().startsWith('0x');
  }, [query]);

  const NoDataUI = useMemo(
    () =>
      isLoading ? (
        <div>
          {Array(10)
            .fill(1)
            .map((_, i) => (
              <DefaultLoading key={i} />
            ))}
        </div>
      ) : (
        <div className="no-token w-full top-[120px]">
          <RcIconMatchCC
            className="w-[32px] h-[32px] text-r-neutral-foot"
            viewBox="0 0 33 32"
          />

          <p className="text-r-neutral-foot text-14 mt-8 text-center mb-0">
            {t('component.TokenSelector.noTokens')}
          </p>
        </div>
      ),
    [isLoading, t, isSearchAddr, chainServerId]
  );

  return (
    <Drawer
      className="token-selector custom-popup is-support-darkmode"
      height={height}
      placement="bottom"
      visible={visible}
      onClose={onCancel}
      closeIcon={
        <RcIconCloseCC className="w-[20px] h-[20px] text-r-neutral-foot" />
      }
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

      <div
        className={clsx(
          'flex items-center justify-between',
          'pb-8 px-20',
          'text-12 text-rabby-neutral-foot'
        )}
      >
        <div>{t('component.TokenSelector.bridge.token')}</div>
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
      </div>

      <ul className={clsx('token-list ', { empty: isEmpty })}>
        {isEmpty
          ? NoDataUI
          : displayList.map((_token) => {
              const token = (_token as any) as TokenItem & {
                trade_volume_level: 'low' | 'high';
              };
              if (itemRender) {
                return itemRender(token, supportChains);
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
                      'token-list__item h-[56px]',
                      disabled && 'opacity-50'
                    )}
                    onClick={() => !disabled && onConfirm(token)}
                  >
                    <div>
                      <TokenWithChain
                        token={token}
                        width="28px"
                        height="28px"
                        hideConer
                      />
                      <div className="flex flex-col gap-1">
                        <span className="symbol text-14 text-r-neutral-title-1 font-medium">
                          {getTokenSymbol(token)}
                        </span>
                        <span className="symbol text-13 font-normal text-r-neutral-foot">
                          ${formatPrice(token.price || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col "></div>

                    <div className="flex flex-col text-right items-end">
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

export default BridgeToTokenSelect;
