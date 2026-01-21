import React, { useMemo, useState } from 'react';
import { DrawerProps } from 'antd';
import { TokenItem } from 'background/service/openapi';
import { useRabbySelector } from '@/ui/store';
import { uniqBy } from 'lodash';
import useSortToken from '@/ui/hooks/useSortTokens';
import { useAsync } from 'react-use';
import { useWallet } from '@/ui/utils';

import TokenSelector, {
  TokenSelectorProps,
} from '@/ui/component/TokenSelector';

interface TokenSelectProps {
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
  getContainer?: DrawerProps['getContainer'];
}

const defaultExcludeTokens = [];

const BridgeToTokenSelect = ({
  fromChainId,
  fromTokenId,
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
  getContainer,
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
    if (tokenListLoading) {
      return [];
    }
    const allTokens = allDisplayTokens;
    return uniqBy(allTokens, (token) => {
      return `${token.chain}-${token.id}`;
    }).filter((e) => !excludeTokens.includes(e.id));
  }, [allDisplayTokens, excludeTokens, tokenListLoading]);

  const displayTokenList = useSortToken(availableToken);

  const isListLoading = tokenListLoading;

  const handleSearchTokens: TokenSelectorProps['onSearch'] = React.useCallback(
    async (ctx) => {
      setQueryConds({
        keyword: ctx.keyword,
      });
    },
    []
  );

  if (tokenRender) {
    return (
      <>
        {typeof tokenRender === 'function'
          ? tokenRender?.({ token, openTokenModal: handleSelectToken })
          : tokenRender}
        {chainId && (
          <TokenSelector
            drawerHeight={drawerHeight}
            visible={tokenSelectorVisible}
            isHideTitle={true}
            mainnetTokenList={displayTokenList}
            onConfirm={handleCurrentTokenChange}
            onCancel={handleTokenSelectorClose}
            onSearch={handleSearchTokens}
            isLoading={isListLoading}
            placeholder={placeholder}
            chainId={chainId}
            disabledTips={'Not supported'}
            supportChains={supportChains}
            getContainer={getContainer}
            type="bridgeTo"
          />
        )}
      </>
    );
  }
  return null;
};
export default BridgeToTokenSelect;
