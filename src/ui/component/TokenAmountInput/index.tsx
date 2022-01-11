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
  chainId: string;
  amountFocus?: boolean;
}

const TokenAmountInput = ({
  token,
  value,
  onChange,
  onTokenChange,
  chainId,
  amountFocus,
}: TokenAmountInputProps) => {
  const tokenInputRef = useRef<Input>(null);
  const latestChainId = useRef(chainId);
  const latestTokenId = useRef(token.id);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [originTokenList, setOriginTokenList] = useState<TokenItem[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [tokenSelectorVisible, setTokenSelectorVisible] = useState(false);
  const wallet = useWallet();
  if (amountFocus) {
    tokenInputRef.current?.focus();
  }
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
    handleLoadTokens();
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

  const handleLoadTokens = async () => {
    setIsListLoading(true);
    let tokens: TokenItem[] = [];
    const currentAccount = await wallet.syncGetCurrentAccount();
    const defaultTokens = await wallet.openapi.listToken(
      currentAccount?.address,
      chainId
    );
    const localAdded =
      (await wallet.getAddedToken(currentAccount?.address)).filter((item) => {
        const [chain] = item.split(':');
        return chain === chainId;
      }) || [];
    let localAddedTokens: TokenItem[] = [];
    if (localAdded.length > 0) {
      localAddedTokens = await wallet.openapi.customListToken(
        localAdded,
        currentAccount?.address
      );
    }
    if (chainId !== latestChainId.current) return;
    tokens = sortTokensByPrice([...defaultTokens, ...localAddedTokens]);
    setOriginTokenList(tokens);
    setTokens(tokens);
    setIsListLoading(false);
  };

  const handleSearchTokens = (q: string) => {
    if (!q) {
      setTokens(originTokenList);
      return;
    }
    const kw = q.trim();
    setTokens(
      originTokenList.filter((token) => {
        if (kw.length === 42 && kw.startsWith('0x')) {
          return token.id.toLowerCase() === kw.toLowerCase();
        } else {
          const reg = new RegExp(kw, 'i');
          return reg.test(token.name) || reg.test(token.symbol);
        }
      })
    );
  };

  useEffect(() => {
    setTokens([]);
    setOriginTokenList([]);
    latestChainId.current = chainId;
  }, [chainId]);

  useEffect(() => {
    latestTokenId.current = token.id;
  }, [token]);

  return (
    <div className="token-amount-input">
      <div className="left" onClick={handleSelectToken}>
        <TokenWithChain token={token} hideConer />
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
        onSearch={handleSearchTokens}
        isLoading={isListLoading}
      />
    </div>
  );
};

export default TokenAmountInput;
