import {
  KEYRING_CLASS,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_TYPES,
} from '@/constant';
import { useWallet } from '@/ui/utils';
import React from 'react';

export const useWalletConnectIcon = (
  account:
    | {
        address: string;
        brandName: string;
        type: string;
      }
    | undefined
    | null
) => {
  const wallet = useWallet();
  const [url, setUrl] = React.useState<string>();

  React.useEffect(() => {
    if (!account) return;
    if (
      account.type !== KEYRING_CLASS.WALLETCONNECT ||
      account.brandName !== WALLET_BRAND_TYPES.WALLETCONNECT
    ) {
      return;
    }

    wallet.getCommonWalletConnectInfo(account.address).then((result) => {
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        setUrl(result.realBrandUrl);
      };
      img.onerror = () => {
        setUrl(WALLET_BRAND_CONTENT.WALLETCONNECT.image);
      };
      img.src = result.realBrandUrl!;
    });
  }, [account]);

  return url;
};
