import { useEffect, useRef, useState, useCallback } from 'react';
import { useWallet } from '../utils/WalletContext';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { DisplayedToken } from '../utils/portfolio/project';
import { AbstractPortfolioToken } from '../utils/portfolio/types';
import { useRabbySelector } from 'ui/store';
import { isSameAddress } from '../utils';
import { requestOpenApiWithChainId } from '../utils/openapi';
import { findChainByServerID } from '@/utils/chain';

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
      setIsLoading(true);
      const chainItem = !chainId ? null : findChainByServerID(chainId);

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
      const reg = new RegExp(q, 'i');
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
    if (!address || !kw) {
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
