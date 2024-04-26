import { useSearchTestnetToken } from '@/ui/hooks/useSearchTestnetToken';
import { useRabbySelector } from '@/ui/store';
import { useTokens } from '@/ui/utils/portfolio/token';
import { findChain } from '@/utils/chain';
import { Input } from 'antd';
import { TokenItem } from 'background/service/openapi';
import clsx from 'clsx';
import uniqBy from 'lodash/uniqBy';
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import IconArrowDown from 'ui/assets/arrow-down-triangle.svg';
import useSearchToken from 'ui/hooks/useSearchToken';
import useSortToken from 'ui/hooks/useSortTokens';
import { splitNumberByStep } from 'ui/utils';
import { abstractTokenToTokenItem, getTokenSymbol } from 'ui/utils/token';
import TokenSelector, { TokenSelectorProps } from '../TokenSelector';
import TokenWithChain from '../TokenWithChain';
import './style.less';
import { INPUT_NUMBER_RE, filterNumber } from '@/constant/regexp';

interface TokenAmountInputProps {
  token: TokenItem;
  value?: string;
  onChange?(amount: string): void;
  onTokenChange(token: TokenItem): void;
  chainId: string;
  amountFocus?: boolean;
  inlinePrize?: boolean;
  excludeTokens?: TokenItem['id'][];
  className?: string;
  type?: TokenSelectorProps['type'];
  placeholder?: string;
}

const TokenAmountInput = ({
  token,
  value,
  onChange,
  onTokenChange,
  chainId,
  amountFocus,
  inlinePrize,
  excludeTokens = [],
  className,
  type = 'default',
  placeholder,
}: TokenAmountInputProps) => {
  const tokenInputRef = useRef<Input>(null);
  const [updateNonce, setUpdateNonce] = useState(0);
  const [tokenSelectorVisible, setTokenSelectorVisible] = useState(false);
  const currentAccount = useRabbySelector(
    (state) => state.account.currentAccount
  );
  const [keyword, setKeyword] = useState('');
  const [chainServerId, setChainServerId] = useState(chainId);

  const chainItem = useMemo(
    () =>
      findChain({
        serverId: chainServerId,
      }),
    [chainServerId]
  );

  const isTestnet = chainItem?.isTestnet;

  useLayoutEffect(() => {
    if (amountFocus && !tokenSelectorVisible) {
      tokenInputRef.current?.focus();
    }
  }, [amountFocus, tokenSelectorVisible]);

  const handleCurrentTokenChange = (token: TokenItem) => {
    onChange && onChange('');
    onTokenChange(token);
    setTokenSelectorVisible(false);
    tokenInputRef.current?.focus();
    setChainServerId(token.chain);
  };

  const handleTokenSelectorClose = () => {
    setChainServerId(chainId);
    setTokenSelectorVisible(false);
  };

  const handleSelectToken = () => {
    if (allTokens.length > 0) {
      setUpdateNonce(updateNonce + 1);
    }
    setTokenSelectorVisible(true);
  };

  // when no any queryConds
  const { tokens: allTokens, isLoading: isLoadingAllTokens } = useTokens(
    currentAccount?.address,
    undefined,
    tokenSelectorVisible,
    updateNonce,
    chainServerId
  );

  const allDisplayTokens = useMemo(() => {
    return allTokens.map(abstractTokenToTokenItem);
  }, [allTokens]);

  const {
    isLoading: isSearchLoading,
    list: searchedTokenByQuery,
  } = useSearchToken(currentAccount?.address, keyword, chainServerId);

  const {
    loading: isSearchTestnetLoading,
    testnetTokenList,
  } = useSearchTestnetToken({
    address: currentAccount?.address,
    withBalance: keyword ? false : true,
    chainId: chainItem?.id,
    q: keyword,
    enabled: isTestnet,
  });

  const availableToken = useMemo(() => {
    const allTokens = chainServerId
      ? allDisplayTokens.filter((token) => token.chain === chainServerId)
      : allDisplayTokens;
    return uniqBy(
      keyword ? searchedTokenByQuery.map(abstractTokenToTokenItem) : allTokens,
      (token) => {
        return `${token.chain}-${token.id}`;
      }
    ).filter((e) => !excludeTokens.includes(e.id));
  }, [
    allDisplayTokens,
    searchedTokenByQuery,
    excludeTokens,
    keyword,
    chainServerId,
  ]);
  const displayTokenList = useSortToken(availableToken);

  const isListLoading = useMemo(() => {
    if (isTestnet) {
      return isSearchTestnetLoading;
    }
    return keyword ? isSearchLoading : isLoadingAllTokens;
  }, [
    keyword,
    isSearchLoading,
    isLoadingAllTokens,
    isSearchTestnetLoading,
    isTestnet,
  ]);

  const handleSearchTokens = React.useCallback(async (ctx) => {
    setKeyword(ctx.keyword);
    setChainServerId(ctx.chainServerId);
  }, []);

  useEffect(() => {
    setChainServerId(chainId);
  }, [chainId]);

  const valueNum = Number(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (INPUT_NUMBER_RE.test(e.target.value)) {
      onChange?.(filterNumber(e.target.value));
    }
  };

  return (
    <div className={clsx('token-amount-input', className)}>
      <div className="left" onClick={handleSelectToken}>
        <TokenWithChain token={token} hideConer />
        <span className="token-input__symbol" title={getTokenSymbol(token)}>
          {getTokenSymbol(token)}
        </span>
        <img src={IconArrowDown} className="icon icon-arrow-down" />
      </div>
      <div
        className={clsx(
          'right relative flex flex-col items-end overflow-hidden',
          !valueNum && 'items-center'
        )}
      >
        <Input
          ref={tokenInputRef}
          placeholder="0"
          className={clsx(!valueNum && 'h-[100%]')}
          value={value}
          onChange={handleChange}
          title={value}
        />
        {inlinePrize && (
          <div
            className={
              'text-r-neutral-foot text-12 text-right max-w-full truncate'
            }
            title={splitNumberByStep(
              ((valueNum || 0) * token.price || 0).toFixed(2)
            )}
          >
            {valueNum
              ? `≈$${splitNumberByStep(
                  ((valueNum || 0) * token.price || 0).toFixed(2)
                )}`
              : ''}
          </div>
        )}
      </div>
      <TokenSelector
        visible={tokenSelectorVisible}
        list={isTestnet ? testnetTokenList : displayTokenList}
        onConfirm={handleCurrentTokenChange}
        onCancel={handleTokenSelectorClose}
        onSearch={handleSearchTokens}
        isLoading={isListLoading}
        type={type}
        placeholder={placeholder}
        chainId={chainServerId}
      />
    </div>
  );
};

export default TokenAmountInput;
