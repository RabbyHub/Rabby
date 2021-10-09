import React, { useEffect, useRef, useState } from 'react';
import { Input } from 'antd';
import cloneDeep from 'lodash/cloneDeep';
import BigNumber from 'bignumber.js';
import { TokenItem } from 'background/service/openapi';
import { useWallet } from 'ui/utils';
import TokenWithChain from '../TokenWithChain';
import TokenSelector from '../TokenSelector';
import IconArrowDown from 'ui/assets/arrow-down-triangle.svg';
import './style.less';

interface TokenAmountInputProps {
  token: TokenItem;
  value?: string;
  onChange?(amount: string): void;
  onTokenChange(token: TokenItem): void;
  address: string;
  chainId: string;
}

const TokenAmountInput = ({
  token,
  value,
  onChange,
  onTokenChange,
  address,
  chainId,
}: TokenAmountInputProps) => {
  const tokenInputRef = useRef<Input>(null);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [originTokenList, setOriginTokenList] = useState<TokenItem[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [tokenSelectorVisible, setTokenSelectorVisible] = useState(false);
  const wallet = useWallet();

  const handleCurrentTokenChange = (token: TokenItem) => {
    onChange && onChange('');
    onTokenChange(token);
    setTokenSelectorVisible(false);
    tokenInputRef.current?.focus();
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

  const sortTokens = (condition: 'common' | 'all', tokens: TokenItem[]) => {
    const copy = cloneDeep(tokens);
    if (condition === 'common') {
      return copy.sort((a, b) => {
        if (a.is_core && !b.is_core) {
          return -1;
        } else if (a.is_core && b.is_core) {
          return 0;
        } else if (!a.is_core && b.is_core) {
          return 1;
        }
        return 0;
      });
    } else {
      return copy;
    }
  };

  const handleSort = (condition: 'common' | 'all') => {
    setTokens(sortTokens(condition, originTokenList));
  };

  const handleLoadTokens = async (q?: string) => {
    let tokens: TokenItem[] = [];
    if (q) {
      tokens = sortTokensByPrice(
        await wallet.openapi.searchToken(address, q, chainId)
      );
    } else {
      tokens = sortTokensByPrice(
        await wallet.openapi.listToken(address, chainId)
      );
      setOriginTokenList(tokens);
      setIsListLoading(false);
    }
    setTokens(sortTokens('common', tokens));
    const existCurrentToken = tokens.find((t) => t.id === token.id);
    if (existCurrentToken) {
      onTokenChange(existCurrentToken);
    }
  };

  useEffect(() => {
    handleLoadTokens();
  }, [chainId]);

  return (
    <div className="token-amount-input">
      <div className="left" onClick={handleSelectToken}>
        <TokenWithChain token={token} />
        <span className="token-input__symbol" title={token.symbol}>
          {token.symbol}
        </span>
        <img src={IconArrowDown} className="icon icon-arrow-down" />
      </div>
      <div className="right">
        <Input
          ref={tokenInputRef}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
        />
      </div>
      <TokenSelector
        visible={tokenSelectorVisible}
        list={tokens}
        onConfirm={handleCurrentTokenChange}
        onCancel={handleTokenSelectorClose}
        onSearch={handleLoadTokens}
        onSort={handleSort}
        isLoading={isListLoading}
      />
    </div>
  );
};

export default TokenAmountInput;
