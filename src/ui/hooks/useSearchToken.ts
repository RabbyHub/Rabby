import { useEffect, useRef, useState, useCallback } from 'react';
import { useWallet } from '../utils/WalletContext';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { DisplayedToken } from '../utils/portfolio/project';
import { AbstractPortfolioToken } from '../utils/portfolio/types';
import { useRabbySelector } from 'ui/store';
import { isSameAddress } from '../utils';

// TODO: include customize tokens
const useSearchToken = (
  address: string | undefined,
  kw: string,
  chainServerId?: string
) => {
  const wallet = useWallet();
  const [result, setResult] = useState<AbstractPortfolioToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const addressRef = useRef(address);
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
      if (q.length === 42 && q.toLowerCase().startsWith('0x')) {
        list = await wallet.openapi.searchToken(address, q, chainId, true);
      } else {
        list = await wallet.openapi.searchToken(address, q, chainId);
      }
      const reg = new RegExp(q, 'i');
      const matchCustomTokens = customize.filter((token) => {
        return (
          reg.test(token.name) ||
          reg.test(token.symbol) ||
          reg.test(token.display_symbol || '')
        );
      });
      if (addressRef.current === address) {
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
    [customize, blocked]
  );

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  useEffect(() => {
    if (!address || !kw) return;
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
