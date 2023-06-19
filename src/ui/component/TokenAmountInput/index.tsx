import React, { useMemo, useRef, useState } from 'react';
import { Input } from 'antd';
import cloneDeep from 'lodash/cloneDeep';
import uniqBy from 'lodash/uniqBy';
import BigNumber from 'bignumber.js';
import { TokenItem } from 'background/service/openapi';
import { splitNumberByStep, useWallet } from 'ui/utils';
import { getTokenSymbol } from 'ui/utils/token';
import TokenWithChain from '../TokenWithChain';
import TokenSelector, {
  isSwapTokenType,
  TokenSelectorProps,
} from '../TokenSelector';
import IconArrowDown from 'ui/assets/arrow-down-triangle.svg';
import './style.less';
import clsx from 'clsx';
import { useAsync } from 'react-use';

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
  const [tokenSelectorVisible, setTokenSelectorVisible] = useState(false);
  const wallet = useWallet();

  const [q, setQ] = useState('');

  if (amountFocus && !tokenSelectorVisible) {
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

  const {
    value: displayTokens = [],
    loading: isSearchLoading,
  } = useAsync(async (): Promise<TokenItem[]> => {
    if (!tokenSelectorVisible) return [];
    if (!q) {
      return originTokenList;
    }

    const kw = q.trim();

    if (kw.length === 42 && kw.toLowerCase().startsWith('0x')) {
      const currentAccount = await wallet.syncGetCurrentAccount();

      const data = await wallet.openapi.searchToken(currentAccount!.address, q);
      return data.filter((e) => e.chain === chainId);
    }
    if (isSwapType) {
      const currentAccount = await wallet.syncGetCurrentAccount();

      const data = await wallet.openapi.searchSwapToken(
        currentAccount!.address,
        chainId,
        q
      );
      return data;
    }

    return originTokenList.filter((token) => {
      const reg = new RegExp(kw, 'i');
      return reg.test(token.name) || reg.test(token.symbol);
    });
  }, [tokenSelectorVisible, originTokenList, q, chainId]);

  const availableToken = useMemo(
    () =>
      uniqBy(displayTokens, (token) => {
        return `${token.chain}-${token.id}`;
      }).filter((e) => !excludeTokens.includes(e.id)),
    [displayTokens, excludeTokens]
  );
  const isListLoading = isTokenLoading || isSearchLoading;

  const handleSearchTokens = React.useCallback(async (q: string) => {
    setQ(q);
  }, []);

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
        list={availableToken}
        onConfirm={handleCurrentTokenChange}
        onCancel={handleTokenSelectorClose}
        onSearch={handleSearchTokens}
        isLoading={isListLoading}
        type={type}
        placeholder={placeholder}
        chainId={chainId}
      />
    </div>
  );
};

export default TokenAmountInput;
