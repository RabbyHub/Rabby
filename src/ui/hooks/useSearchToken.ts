import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useWallet } from '../utils/WalletContext';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import {
  DisplayedToken,
  encodeProjectTokenId,
} from '../utils/portfolio/project';
import { AbstractPortfolioToken } from '../utils/portfolio/types';
import { useRabbyDispatch, useRabbySelector } from 'ui/store';
import { isSameAddress } from '../utils';
import { requestOpenApiWithChainId } from '../utils/openapi';
import { findChainByServerID } from '@/utils/chain';
import { Chain } from '@debank/common';
import useDebounceValue from './useDebounceValue';
import { useRefState } from './useRefState';
import { safeBuildRegExp } from '@/utils/string';

function isSearchInputWeb3Address(q: string) {
  return q.length === 42 && q.toLowerCase().startsWith('0x');
}

export function useIsTokenAddedLocally(token?: TokenItem | null) {
  const { customize, blocked } = useRabbySelector(
    (state) => state.account.tokens
  );

  const addedInfo = useMemo(() => {
    if (!token) return { onCustomize: false, onBlocked: false, isLocal: false };

    const onCustomize = !!customize.find(
      (t) => t.id === encodeProjectTokenId(token)
    );
    const onBlocked =
      !onCustomize &&
      !!blocked.find(
        (t) => t.chain && token.chain && isSameAddress(t.id, token.id)
      );

    return {
      onCustomize,
      onBlocked,
      isLocal: onCustomize || onBlocked,
    };
  }, [customize, token?.id]);

  return addedInfo;
}

export function varyTokensByLocal<
  T extends TokenItem[] | AbstractPortfolioToken[]
>(
  tokenList: T,
  input: {
    customize?: AbstractPortfolioToken[];
    blocked?: AbstractPortfolioToken[];
  }
) {
  const { customize = [], blocked = [] } = input;

  const varied = {
    remote: [] as TokenItem[],
    local: [] as TokenItem[],
  };
  const localMap = {} as Record<TokenItem['id'], TokenItem>;
  const wholeList = customize.concat(blocked);
  for (let i = 0; i < wholeList.length; i++) {
    const item = wholeList[i];
    localMap[`${item.chain}-${item.id}`] = item;
  }

  tokenList.forEach((token) => {
    const matched = localMap[`${token.chain}-${token.id}`];
    if (matched) {
      varied.local.push(matched);
    } else {
      varied.remote.push(token);
    }
  });

  return varied;
}

export function useVaryTokensByLocal<
  T extends TokenItem[] | AbstractPortfolioToken[]
>(tokenList: T) {
  const { customize, blocked } = useRabbySelector(
    (state) => state.account.tokens
  );

  const varied = useMemo(() => {
    return varyTokensByLocal(tokenList, { customize, blocked });
  }, [customize, blocked]);

  return varied;
}

export function useOperateCustomToken() {
  const dispatch = useRabbyDispatch();

  const addToken = useCallback(async (tokenWithAmount: TokenItem) => {
    if (!tokenWithAmount) return;

    if (tokenWithAmount.is_core) {
      return dispatch.account.addBlockedToken(
        new DisplayedToken(tokenWithAmount) as AbstractPortfolioToken
      );
    } else {
      return dispatch.account.addCustomizeToken(
        new DisplayedToken(tokenWithAmount) as AbstractPortfolioToken
      );
    }
  }, []);

  const removeToken = useCallback(async (tokenWithAmount: TokenItem) => {
    if (!tokenWithAmount) return;

    if (tokenWithAmount?.is_core) {
      return dispatch.account.removeBlockedToken(
        new DisplayedToken(tokenWithAmount) as AbstractPortfolioToken
      );
    } else {
      return dispatch.account.removeCustomizeToken(
        new DisplayedToken(tokenWithAmount) as AbstractPortfolioToken
      );
    }
  }, []);

  return {
    addToken,
    removeToken,
  };
}

/** eslint-enable react-hooks/exhaustive-deps */
export function useFindCustomToken(input?: {
  // address: string,
  chainServerId?: Chain['serverId'];
  isTestnet?: boolean;
  autoSearch?: boolean;
}) {
  const {
    // address,
    // chainServerId: _propchainServerId,
    isTestnet = false,
    autoSearch,
  } = input || {};

  const wallet = useWallet();
  const [{ tokenList, portfolioTokenList }, setLists] = useState<{
    tokenList: TokenItem[];
    portfolioTokenList: AbstractPortfolioToken[];
  }>({
    tokenList: [],
    portfolioTokenList: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const {
    state: searchKeyword,
    setRefState: setSearchKeyword,
    stateRef: skRef,
  } = useRefState('');
  const debouncedSearchKeyword = useDebounceValue(searchKeyword, 150);
  const { customize, blocked } = useRabbySelector(
    (state) => state.account.tokens
  );

  const searchCustomToken = useCallback(
    async (
      opt: {
        address?: string;
        q?: string;
        chainServerId?: Chain['serverId'];
      } = {}
    ) => {
      const { address, q = debouncedSearchKeyword, chainServerId } = opt || {};

      const lists: {
        tokenList: TokenItem[];
        portfolioTokenList: AbstractPortfolioToken[];
      } = {
        tokenList: [],
        portfolioTokenList: [],
      };
      if (!address) return lists;

      const chainItem = !chainServerId
        ? null
        : findChainByServerID(chainServerId);
      if (isTestnet || chainItem?.isTestnet) {
        return;
      }

      setIsLoading(true);

      try {
        if (isSearchInputWeb3Address(q)) {
          lists.tokenList = await requestOpenApiWithChainId(
            (ctx) => ctx.openapi.searchToken(address, q, chainServerId, true),
            {
              isTestnet: !!isTestnet || !!chainItem?.isTestnet,
              wallet,
            }
            // filter out core tokens
          );
          // .then((res) => res.filter((item) => !item.is_core));
        } else {
          // lists.tokenList = await requestOpenApiWithChainId(
          //   (ctx) => ctx.openapi.searchToken(address, q, chainServerId),
          //   {
          //     isTestnet: !!isTestnet || !!chainItem?.isTestnet,
          //     wallet,
          //   }
          // );
        }

        if (q === skRef.current) {
          // const reg = new RegExp(debouncedSearchKeyword, 'i');
          // const matchCustomTokens = customize.filter((token) => {
          //   return (
          //     reg.test(token.name) ||
          //     reg.test(token.symbol) ||
          //     reg.test(token.display_symbol || '')
          //   );
          // });

          lists.portfolioTokenList = [
            ...(lists.tokenList.map(
              (item) => new DisplayedToken(item)
            ) as AbstractPortfolioToken[]),
            // ...matchCustomTokens,
          ].filter((item) => {
            const isBlocked = !!blocked.find((b) =>
              isSameAddress(b.id, item.id)
            );
            return !isBlocked;
          });
        }
        setLists(lists);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }

      return lists;
    },
    [debouncedSearchKeyword, blocked, isTestnet]
  );

  useEffect(() => {
    if (autoSearch) {
      searchCustomToken();
    }
  }, [autoSearch, searchCustomToken]);

  const resetSearchResult = useCallback(() => {
    setLists({
      tokenList: [],
      portfolioTokenList: [],
    });
  }, []);

  return {
    searchCustomToken,
    debouncedSearchKeyword,
    setSearchKeyword,
    resetSearchResult,
    tokenList,
    foundTokenList: portfolioTokenList,
    isLoading,
  };
}
/** eslint-disable react-hooks/exhaustive-deps */

const useSearchToken = (
  address: string | undefined,
  kw: string,
  chainServerId?: string,
  withBalance = false,
  isTestnet = false
) => {
  const wallet = useWallet();
  const [result, setResult] = useState<AbstractPortfolioToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const addressRef = useRef(address);
  const kwRef = useRef('');
  const { customize, blocked } = useRabbySelector(
    (state) => state.account.tokens
  );

  const searchToken = useCallback(
    async ({
      address,
      q,
      chainId,
    }: {
      address: string;
      q: string;
      chainId?: string;
    }) => {
      let list: TokenItem[] = [];
      const chainItem = !chainId ? null : findChainByServerID(chainId);
      if (isTestnet || chainItem?.isTestnet) {
        return;
      }
      setIsLoading(true);

      if (q.length === 42 && q.toLowerCase().startsWith('0x')) {
        list = await requestOpenApiWithChainId(
          (ctx) => ctx.openapi.searchToken(address, q, chainId, true),
          {
            isTestnet: isTestnet !== false || chainItem?.isTestnet,
            wallet,
          }
        );
      } else {
        list = await requestOpenApiWithChainId(
          (ctx) => ctx.openapi.searchToken(address, q, chainId),
          {
            isTestnet: isTestnet !== false || chainItem?.isTestnet,
            wallet,
          }
        );
        if (withBalance) {
          list = list.filter((item) => item.amount > 0);
        }
      }
      const reg = safeBuildRegExp(q, 'i');
      const matchCustomTokens = customize.filter((token) => {
        return (
          reg.test(token.name) ||
          reg.test(token.symbol) ||
          reg.test(token.display_symbol || '')
        );
      });
      if (addressRef.current === address && kwRef.current === q) {
        setIsLoading(false);
        setResult(
          [
            ...(list.map(
              (item) => new DisplayedToken(item)
            ) as AbstractPortfolioToken[]),
            ...matchCustomTokens,
          ].filter((item) => {
            const isBlocked = !!blocked.find((b) =>
              isSameAddress(b.id, item.id)
            );
            return !isBlocked;
          })
        );
      }
    },
    [customize, blocked, isTestnet]
  );

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  useEffect(() => {
    kwRef.current = kw;
  }, [kw]);

  useEffect(() => {
    if (!address || !kw || isTestnet) {
      setIsLoading(false);
      return;
    }
    searchToken({
      address,
      q: kw,
      chainId: chainServerId,
    });
  }, [kw, address, chainServerId]);

  return {
    list: result,
    isLoading,
  };
};

export default useSearchToken;
