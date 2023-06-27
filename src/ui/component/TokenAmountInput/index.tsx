import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from 'antd';
import uniqBy from 'lodash/uniqBy';
import { TokenItem } from 'background/service/openapi';
import { splitNumberByStep } from 'ui/utils';
import { getTokenSymbol, abstractTokenToTokenItem } from 'ui/utils/token';
import TokenWithChain from '../TokenWithChain';
import TokenSelector, {
  isSwapTokenType,
  TokenSelectorProps,
} from '../TokenSelector';
import IconArrowDown from 'ui/assets/arrow-down-triangle.svg';
import './style.less';
import clsx from 'clsx';
import { useTokens } from '@/ui/utils/portfolio/token';
import useSearchToken from 'ui/hooks/useSearchToken';
import useSortToken from 'ui/hooks/useSortTokens';
import { useRabbySelector } from '@/ui/store';

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

  const [queryConds, setQueryConds] = useState({
    keyword: '',
    chainServerId: chainId,
  });

  if (amountFocus && !tokenSelectorVisible) {
    tokenInputRef.current?.focus();
  }
  const handleCurrentTokenChange = (token: TokenItem) => {
    onChange && onChange('');
    onTokenChange(token);
    setTokenSelectorVisible(false);
    tokenInputRef.current?.focus();

    setQueryConds((prev) => ({ ...prev, chainServerId: token.chain }));
  };

  const handleTokenSelectorClose = () => {
    setTokenSelectorVisible(false);
  };

  const handleSelectToken = () => {
    if (allTokens.length > 0) {
      setUpdateNonce(updateNonce + 1);
    }
    setTokenSelectorVisible(true);
  };

  const isSwapType = isSwapTokenType(type);

  // when no any queryConds
  const { tokens: allTokens, isLoading: isLoadingAllTokens } = useTokens(
    currentAccount?.address,
    undefined,
    tokenSelectorVisible,
    updateNonce,
    queryConds.chainServerId
  );

  const allDisplayTokens = useMemo(() => {
    return allTokens.map(abstractTokenToTokenItem);
  }, [allTokens]);

  const {
    isLoading: isSearchLoading,
    list: searchedTokenByQuery,
  } = useSearchToken(
    currentAccount?.address,
    queryConds.keyword,
    queryConds.chainServerId,
    isSwapType ? false : true
  );

  const availableToken = useMemo(() => {
    const allTokens = queryConds.chainServerId
      ? allDisplayTokens.filter(
          (token) => token.chain === queryConds.chainServerId
        )
      : allDisplayTokens;
    return uniqBy(
      queryConds.keyword
        ? searchedTokenByQuery.map(abstractTokenToTokenItem)
        : allTokens,
      (token) => {
        return `${token.chain}-${token.id}`;
      }
    ).filter((e) => !excludeTokens.includes(e.id));
  }, [allDisplayTokens, searchedTokenByQuery, excludeTokens, queryConds]);
  const displayTokenList = useSortToken(availableToken);
  const isListLoading = queryConds.keyword
    ? isSearchLoading
    : isLoadingAllTokens;

  const handleSearchTokens = React.useCallback(async (ctx) => {
    setQueryConds({
      keyword: ctx.keyword,
      chainServerId: ctx.chainServerId,
    });
  }, []);

  useEffect(() => {
    setQueryConds((prev) => ({
      ...prev,
      chainServerId: chainId,
    }));
  }, [chainId]);

  return (
    <div className={clsx('token-amount-input', className)}>
      <div className="left" onClick={handleSelectToken}>
        <TokenWithChain token={token} hideConer />
        <span className="token-input__symbol" title={getTokenSymbol(token)}>
          {getTokenSymbol(token)}
        </span>
        <img src={IconArrowDown} className="icon icon-arrow-down" />
      </div>
      <div className="right relative flex flex-col items-end overflow-hidden">
        <Input
          ref={tokenInputRef}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          title={value}
        />
        {inlinePrize && (
          <div
            className="text-gray-content text-12 text-right max-w-full truncate"
            title={splitNumberByStep(
              ((Number(value) || 0) * token.price || 0).toFixed(2)
            )}
          >
            {Number(value)
              ? `≈$${splitNumberByStep(
                  ((Number(value) || 0) * token.price || 0).toFixed(2)
                )}`
              : ''}
          </div>
        )}
      </div>
      <TokenSelector
        visible={tokenSelectorVisible}
        list={displayTokenList}
        onConfirm={handleCurrentTokenChange}
        onCancel={handleTokenSelectorClose}
        onSearch={handleSearchTokens}
        isLoading={isListLoading}
        type={type}
        placeholder={placeholder}
        chainId={queryConds.chainServerId}
      />
    </div>
  );
};

export default TokenAmountInput;
