import React, {
  ComponentProps,
  useMemo,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { DrawerProps, Input, Skeleton } from 'antd';
import { TokenItem, TokenItemWithEntity } from 'background/service/openapi';
import { abstractTokenToTokenItem, getTokenSymbol } from 'ui/utils/token';
import TokenWithChain from '../TokenWithChain';
import TokenSelector, { isSwapTokenType } from '../TokenSelector';
import styled from 'styled-components';
import LessPalette, { ellipsis } from '@/ui/style/var-defs';
import { ReactComponent as SvgIconArrowDownTriangle } from '@/ui/assets/swap/arrow-caret-down2.svg';
import { useTokens } from '@/ui/utils/portfolio/token';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { uniqBy } from 'lodash';
import { CHAINS_ENUM } from '@/constant';
import useSearchToken from '@/ui/hooks/useSearchToken';
import useSortToken from '@/ui/hooks/useSortTokens';
import { useAsync } from 'react-use';
import { getUiType, useWallet } from '@/ui/utils';
import { isAddress } from 'viem/utils';
import { useTranslation } from 'react-i18next';
import {
  concatAndSort,
  contactAmountTokens,
} from '@/ui/utils/portfolio/tokenUtils';
const isTab = getUiType().isTab;

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

interface CommonProps {
  token?: TokenItem;
  onChange?(amount: string): void;
  onTokenChange(token: TokenItem): void;
  useSwapTokenList?: boolean;
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
  disabledTips?: React.ReactNode;
  drawerHeight?: string | number;
  supportChains?: CHAINS_ENUM[];
  getContainer?: DrawerProps['getContainer'];
  onStartSelectChain?: () => void;
}

interface BridgeFromProps extends CommonProps {
  type: 'bridgeFrom';
  chainId?: string;
}

interface OtherProps extends CommonProps {
  type: Exclude<ComponentProps<typeof TokenSelector>['type'], 'bridgeFrom'>;
  chainId: string;
}

type TokenSelectProps = BridgeFromProps | OtherProps;

const defaultExcludeTokens = [];

const TokenSelect = forwardRef<
  { openTokenModal: React.Dispatch<React.SetStateAction<boolean>> },
  TokenSelectProps
>(
  (
    {
      token,
      onChange,
      onTokenChange,
      chainId,
      excludeTokens = defaultExcludeTokens,
      type = 'default',
      placeholder,
      hideChainIcon = true,
      value,
      loading = false,
      tokenRender,
      useSwapTokenList = false,
      disabledTips = 'Not supported',
      drawerHeight,
      supportChains,
      getContainer,
      onStartSelectChain,
    },
    ref
  ) => {
    const [queryConds, setQueryConds] = useState({
      keyword: '',
      chainServerId: chainId,
    });
    const [tokenSelectorVisible, setTokenSelectorVisible] = useState(false);
    const [initLoading, setInitLoading] = useState(true);
    const [updateNonce, setUpdateNonce] = useState(0);
    const [lpTokenMode, setLpTokenMode] = useState(false);
    const { currentAccount } = useRabbySelector((s) => ({
      currentAccount: s.account.currentAccount,
    }));
    const wallet = useWallet();
    const { t } = useTranslation();
    const isFromMode = useMemo(() => {
      return type === 'swapFrom' || type === 'bridgeFrom' || type === 'send';
    }, [type]);

    useImperativeHandle(ref, () => ({
      openTokenModal: setTokenSelectorVisible,
    }));

    useEffect(() => {
      setInitLoading(!tokenSelectorVisible);
    }, [tokenSelectorVisible]);

    const handleCurrentTokenChange = (token: TokenItem) => {
      onChange && onChange('');
      onTokenChange(token);
      setLpTokenMode(false);
      setTokenSelectorVisible(false);

      // const chainItem = findChainByServerID(token.chain);
      setQueryConds((prev) => ({ ...prev, chainServerId: token.chain }));
    };

    const handleTokenSelectorClose = () => {
      setTokenSelectorVisible(false);
      setQueryConds((prev) => ({
        ...prev,
        chainServerId: chainId,
      }));
      setLpTokenMode(false);
    };

    const handleSelectToken = () => {
      if (allDisplayTokens.length > 0) {
        setUpdateNonce(updateNonce + 1);
      }
      setTokenSelectorVisible(true);
    };

    const isSwapType = isSwapTokenType(type);

    // when no any queryConds
    const {
      tokens: allTokens,
      isLoading: isLoadingAllTokens,
      isAllTokenLoading, // 包含lp Token的请求
    } = useTokens(
      useSwapTokenList ? undefined : currentAccount?.address,
      undefined,
      tokenSelectorVisible,
      updateNonce,
      queryConds.chainServerId,
      undefined,
      isFromMode ? lpTokenMode : undefined, // only show lp tokens in from mode
      undefined,
      !!queryConds.keyword
    );

    const {
      value: swapTokenList,
      loading: swapTokenListLoading,
    } = useAsync(async () => {
      if (!currentAccount || !useSwapTokenList || !tokenSelectorVisible)
        return [];
      const list = await wallet.openapi.getSwapTokenList(
        currentAccount.address,
        queryConds.chainServerId ? queryConds.chainServerId : undefined
      );
      return list;
    }, [
      queryConds.chainServerId,
      currentAccount,
      useSwapTokenList,
      tokenSelectorVisible,
    ]);

    const allDisplayTokens = useMemo(() => {
      if (useSwapTokenList) return swapTokenList || [];
      return allTokens.map(abstractTokenToTokenItem);
    }, [allTokens, swapTokenList, useSwapTokenList]);

    const {
      isLoading: isSearchLoading,
      list: searchedTokenByQuery,
    } = useSearchToken(currentAccount?.address, queryConds.keyword, {
      chainServerId: queryConds.chainServerId,
      withBalance: isSwapType || type === 'bridgeFrom' ? false : true,
    });

    const isSwapTo = type === 'swapTo';

    const {
      value: remoteSwapToSearchTokens,
      loading: remoteSwapToSearchTokensLoading,
    } = useAsync(
      () =>
        queryConds?.keyword && isSwapTo
          ? wallet.openapi.searchTokensV2({
              q: queryConds?.keyword,
              chain_id: queryConds.chainServerId || '',
            })
          : Promise.resolve([] as TokenItemWithEntity[]),
      [queryConds?.keyword, isSwapTo, queryConds?.chainServerId]
    );

    const availableToken = useMemo(() => {
      const allTokens = queryConds.chainServerId
        ? allDisplayTokens.filter(
            (token) => token.chain === queryConds.chainServerId
          )
        : allDisplayTokens;
      return uniqBy(
        queryConds.keyword
          ? isSwapTo
            ? contactAmountTokens(
                // remoteSwapToSearchTokens获取的接口不好加amount，就从已推荐列表中找到amount合并进去
                remoteSwapToSearchTokens || [],
                swapTokenList || []
              )
                ?.filter((e) => e.chain === queryConds.chainServerId)
                .filter((e) =>
                  isAddress(queryConds.keyword, { strict: false })
                    ? true
                    : !!e.is_core
                )
            : concatAndSort(
                searchedTokenByQuery.map(abstractTokenToTokenItem),
                allTokens,
                queryConds.keyword
              )
          : allTokens,
        (token) => {
          return `${token.chain}-${token.id}`;
        }
      ).filter((e) => !excludeTokens.includes(e.id));
    }, [
      allDisplayTokens,
      searchedTokenByQuery,
      excludeTokens,
      queryConds,
      isSwapTo,
      swapTokenList,
      remoteSwapToSearchTokens,
    ]);

    const displaySortedTokenList = useSortToken(availableToken);

    const displayTokenList = useMemo(() => {
      if (isSwapTo) {
        return availableToken;
      }
      return displaySortedTokenList?.length
        ? displaySortedTokenList
        : availableToken;
    }, [availableToken, displaySortedTokenList, isSwapTo]);

    const isListLoading =
      !!(queryConds.keyword
        ? isSearchLoading || remoteSwapToSearchTokensLoading
        : useSwapTokenList
        ? swapTokenListLoading
        : isLoadingAllTokens || (lpTokenMode && isAllTokenLoading)) ||
      initLoading;

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
          <TokenSelector
            drawerHeight={drawerHeight}
            visible={tokenSelectorVisible}
            mainnetTokenList={displayTokenList}
            onConfirm={handleCurrentTokenChange}
            onCancel={handleTokenSelectorClose}
            onSearch={handleSearchTokens}
            isLoading={isListLoading}
            type={type}
            placeholder={placeholder}
            chainId={queryConds.chainServerId!}
            disabledTips={disabledTips}
            supportChains={supportChains}
            excludeTokens={excludeTokens}
            getContainer={getContainer}
            lpTokenMode={lpTokenMode}
            setLpTokenMode={setLpTokenMode}
            showLpTokenSwitch={isFromMode}
            onStartSelectChain={onStartSelectChain}
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
                <Text title={getTokenSymbol(token)}>
                  {getTokenSymbol(token)}
                </Text>
                <SvgIconArrowDownTriangle className="ml-[3px]" />
              </TokenWrapper>
            ) : (
              <SelectTips>
                <span>{t('page.sendToken.selectToken')}</span>
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
              autoFocus={type !== 'swapTo' && !isTab}
              autoCorrect="false"
              autoComplete="false"
              value={value ?? input}
              onChange={type !== 'swapTo' ? handleInput : undefined}
            />
          )}
        </Wrapper>
        <TokenSelector
          visible={tokenSelectorVisible}
          mainnetTokenList={displayTokenList}
          onConfirm={handleCurrentTokenChange}
          onCancel={handleTokenSelectorClose}
          onSearch={handleSearchTokens}
          isLoading={isListLoading}
          type={type}
          placeholder={placeholder}
          chainId={queryConds.chainServerId!}
          disabledTips={disabledTips}
          supportChains={supportChains}
          drawerHeight={drawerHeight}
          excludeTokens={excludeTokens}
          lpTokenMode={lpTokenMode}
          setLpTokenMode={setLpTokenMode}
          showLpTokenSwitch={isFromMode}
          onStartSelectChain={onStartSelectChain}
        />
      </>
    );
  }
);

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
export default TokenSelect;
