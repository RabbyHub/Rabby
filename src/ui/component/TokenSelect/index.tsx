import React, {
  ComponentProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Skeleton, Space } from 'antd';
import cloneDeep from 'lodash/cloneDeep';
import BigNumber from 'bignumber.js';
import { TokenItem } from 'background/service/openapi';
import { useWalletOld } from 'ui/utils';
import TokenWithChain from '../TokenWithChain';
import TokenSelector from '../TokenSelector';
import styled from 'styled-components';
import LessPalette from '@/ui/style/var-defs';
import { ReactComponent as SvgIconArrowDownTriangle } from '@/ui/assets/swap/arrow-caret-down.svg';

const Wrapper = styled.div`
  background: ${LessPalette['@color-bg']};
  border-radius: 4px;
  padding: 16px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
`;

const Text = styled.span`
  font-size: 15px;
  line-height: 18px;
  color: ${LessPalette['@color-title']};
`;

interface TokenAmountInputProps {
  token?: TokenItem;
  onChange?(amount: string): void;
  onTokenChange(token: TokenItem): void;
  chainId: string;
  excludeTokens?: TokenItem['id'][];
  type?: ComponentProps<typeof TokenSelector>['type'];
}

const TokenSelect = ({
  token,
  onChange,
  onTokenChange,
  chainId,
  excludeTokens = [],
  type = 'default',
}: TokenAmountInputProps) => {
  const latestChainId = useRef(chainId);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [originTokenList, setOriginTokenList] = useState<TokenItem[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [tokenSelectorVisible, setTokenSelectorVisible] = useState(false);
  const wallet = useWalletOld();

  const handleCurrentTokenChange = (token: TokenItem) => {
    onChange && onChange('');
    onTokenChange(token);
    setTokenSelectorVisible(false);
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

  const availableToken = useMemo(
    () => tokens.filter((e) => !excludeTokens.includes(e.id)),
    [excludeTokens, tokens]
  );

  useEffect(() => {
    setTokens([]);
    setOriginTokenList([]);
    latestChainId.current = chainId;
  }, [chainId]);

  return (
    <>
      <Wrapper onClick={handleSelectToken}>
        {token ? (
          <Space size={8}>
            <TokenWithChain token={token} hideConer />
            <Text>{token.symbol}</Text>
          </Space>
        ) : (
          <Space size={8}>
            <Skeleton.Avatar />
            <Text>Select a token</Text>
          </Space>
        )}
        <SvgIconArrowDownTriangle width={24} height={24} />
      </Wrapper>
      <TokenSelector
        visible={tokenSelectorVisible}
        list={availableToken}
        onConfirm={handleCurrentTokenChange}
        onCancel={handleTokenSelectorClose}
        onSearch={handleSearchTokens}
        isLoading={isListLoading}
        type={type}
      />
    </>
  );
};

export default TokenSelect;
