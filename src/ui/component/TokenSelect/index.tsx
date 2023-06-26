import React, { ComponentProps, useMemo, useState } from 'react';
import { Input, Skeleton } from 'antd';
import cloneDeep from 'lodash/cloneDeep';
import BigNumber from 'bignumber.js';
import { TokenItem } from 'background/service/openapi';
import { useWallet } from 'ui/utils';
import { getTokenSymbol } from 'ui/utils/token';
import TokenWithChain from '../TokenWithChain';
import TokenSelector, { isSwapTokenType } from '../TokenSelector';
import styled from 'styled-components';
import LessPalette, { ellipsis } from '@/ui/style/var-defs';
import { ReactComponent as SvgIconArrowDownTriangle } from '@/ui/assets/swap/arrow-caret-down2.svg';
import { useAsync } from 'react-use';
import { useTokens } from '@/ui/utils/portfolio/token';
import { useRabbyGetter } from '@/ui/store';
import { uniqBy } from 'lodash';

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
  token?: TokenItem;
  onChange?(amount: string): void;
  onTokenChange(token: TokenItem): void;
  chainId: string;
  excludeTokens?: TokenItem['id'][];
  type?: ComponentProps<typeof TokenSelector>['type'];
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
}

const TokenSelect = ({
  token,
  onChange,
  onTokenChange,
  chainId,
  excludeTokens = [],
  type = 'default',
  placeholder,
  hideChainIcon = true,
  value,
  loading = false,
  tokenRender,
}: TokenSelectProps) => {
  const [queryConds, setQueryConds] = useState({
    keyword: '',
    chainServerId: chainId,
  });
  const [tokenSelectorVisible, setTokenSelectorVisible] = useState(false);
  const wallet = useWallet();

  const handleCurrentTokenChange = (token: TokenItem) => {
    onChange && onChange('');
    onTokenChange(token);
    setTokenSelectorVisible(false);

    // const chainItem = findChainByServerID(token.chain);
    setQueryConds((prev) => ({ ...prev, chainServerId: token.chain }));
  };

  const handleTokenSelectorClose = () => {
    setTokenSelectorVisible(false);
  };

  const handleSelectToken = () => {
    setTokenSelectorVisible(true);
  };

  const sortTokensByPrice = (tokens: TokenItem[]) => {
    const copy = cloneDeep(tokens);
    return copy.sort((a, b) => {
      return new BigNumber(b.amount)
        .times(new BigNumber(b.price || 0))
        .minus(new BigNumber(a.amount).times(new BigNumber(a.price || 0)))
        .toNumber();
    });
  };
  const isSwapType = isSwapTokenType(type);

  const {
    value: originTokenList = [],
    loading: isTokenLoading,
  } = useAsync(async () => {
    if (!tokenSelectorVisible) return [];
    let tokens: TokenItem[] = [];
    const currentAccount = await wallet.syncGetCurrentAccount();

    const getDefaultTokens = isSwapType
      ? wallet.openapi.getSwapTokenList
      : wallet.openapi.listToken;

    const currentAddress = currentAccount?.address || '';
    const defaultTokens = await getDefaultTokens(currentAddress, chainId);
    let localAddedTokens: TokenItem[] = [];

    if (!isSwapType) {
      const localAdded =
        (await wallet.getAddedToken(currentAddress)).filter((item) => {
          const [chain] = item.split(':');
          return chain === chainId;
        }) || [];
      if (localAdded.length > 0) {
        localAddedTokens = await wallet.openapi.customListToken(
          localAdded,
          currentAddress
        );
      }
    }
    tokens = sortTokensByPrice([
      ...defaultTokens,
      ...localAddedTokens,
    ]).filter((e) => (type === 'swapFrom' ? e.amount > 0 : true));

    return tokens;
  }, [tokenSelectorVisible, chainId, isSwapType]);

  const currentAccountAddr = useRabbyGetter(
    (s) => s.account.currentAccountAddr
  );

  const isTokensFromSearchSearch =
    !!queryConds.chainServerId || !!queryConds.keyword;

  // when no any queryConds
  const { tokens: allTokens, isLoading: isLoadingAllTokens } = useTokens(
    isTokensFromSearchSearch ? '' : currentAccountAddr
  );

  const {
    value: searchedTokenByQuery = [],
    loading: isSearchLoading,
  } = useAsync(async (): Promise<TokenItem[]> => {
    if (!tokenSelectorVisible) return [];
    if (!queryConds.keyword) {
      return originTokenList;
    }

    const kw = queryConds.keyword.trim();

    if (kw.length === 42 && kw.toLowerCase().startsWith('0x')) {
      const currentAccount = await wallet.syncGetCurrentAccount();

      const data = await wallet.openapi.searchToken(
        currentAccount!.address,
        queryConds.keyword,
        queryConds.chainServerId
      );
      return data.filter((e) => e.chain === queryConds.chainServerId);
    } else if (isTokensFromSearchSearch) {
      const currentAccount = await wallet.syncGetCurrentAccount();

      const data = await wallet.openapi.searchToken(
        currentAccount!.address,
        queryConds.keyword,
        '',
        true
      );

      return !kw
        ? data
        : data.filter((token) => {
            const reg = new RegExp(kw, 'i');
            return reg.test(token.name) || reg.test(token.symbol);
          });
    }
    if (isSwapType) {
      const currentAccount = await wallet.syncGetCurrentAccount();

      const data = await wallet.openapi.searchSwapToken(
        currentAccount!.address,
        // chainId,
        queryConds.chainServerId,
        queryConds.keyword
      );
      return data;
    }

    return !kw
      ? originTokenList
      : originTokenList.filter((token) => {
          const reg = new RegExp(kw, 'i');
          return reg.test(token.name) || reg.test(token.symbol);
        });
  }, [
    tokenSelectorVisible,
    originTokenList,
    isTokensFromSearchSearch,
    queryConds.keyword,
    queryConds.chainServerId,
  ]);

  const availableToken = useMemo(
    () =>
      uniqBy(
        !isTokensFromSearchSearch ? allTokens : searchedTokenByQuery,
        (token) => {
          return `${token.chain}-${token.id}`;
        }
      ).filter((e) => !excludeTokens.includes(e.id)),
    [allTokens, searchedTokenByQuery, isTokensFromSearchSearch, excludeTokens]
  );
  const isListLoading =
    isTokenLoading ||
    (isTokensFromSearchSearch ? isSearchLoading : isLoadingAllTokens);

  const handleSearchTokens = React.useCallback(async (ctx) => {
    setQueryConds({
      keyword: ctx.keyword,
      chainServerId: ctx.chainServerId,
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

  if (tokenRender) {
    return (
      <>
        {typeof tokenRender === 'function'
          ? tokenRender?.({ token, openTokenModal: handleSelectToken })
          : tokenRender}
        <TokenSelector
          visible={tokenSelectorVisible}
          list={availableToken}
          onConfirm={handleCurrentTokenChange}
          onCancel={handleTokenSelectorClose}
          onSearch={handleSearchTokens}
          isLoading={isListLoading}
          type={type}
          placeholder={placeholder}
          chainId={queryConds.chainServerId}
        />
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
            readOnly={type === 'swapTo'}
            placeholder={'0'}
            autoFocus={type !== 'swapTo'}
            autoCorrect="false"
            autoComplete="false"
            value={value ?? input}
            onChange={type !== 'swapTo' ? handleInput : undefined}
          />
        )}
      </Wrapper>
      <TokenSelector
        visible={tokenSelectorVisible}
        list={availableToken}
        onConfirm={handleCurrentTokenChange}
        onCancel={handleTokenSelectorClose}
        onSearch={handleSearchTokens}
        isLoading={isListLoading}
        type={type}
        placeholder={placeholder}
        chainId={queryConds.chainServerId}
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
  background: #8697ff;
  border-radius: 4px;
  font-weight: 500;
  font-size: 20px;
  line-height: 23px;
  & svg {
    margin-left: 4px;
    filter: brightness(1000);
  }
`;
export default TokenSelect;
