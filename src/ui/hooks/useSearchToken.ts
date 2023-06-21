import { useEffect, useRef, useState, useCallback } from 'react';
import { useWallet } from '../utils/WalletContext';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { DisplayedToken } from '../utils/portfolio/project';
import { AbstractPortfolioToken } from '../utils/portfolio/types';

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
      if (kw.length === 42 && kw.toLowerCase().startsWith('0x')) {
        list = await wallet.openapi.searchToken(address, q, chainId, true);
      } else {
        list = await wallet.openapi.searchToken(address, q, chainId);
      }
      if (addressRef.current === address) {
        setIsLoading(false);
        setResult(
          list.map(
            (item) => new DisplayedToken(item)
          ) as AbstractPortfolioToken[]
        );
      }
    },
    []
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
