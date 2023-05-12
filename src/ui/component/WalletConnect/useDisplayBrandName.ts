import { WALLET_BRAND_CONTENT, WALLET_BRAND_TYPES } from '@/constant';
import { useWallet } from '@/ui/utils';
import React from 'react';

export const WALLET_BRAND_NAME_KEY = {};

Object.keys(WALLET_BRAND_CONTENT).forEach((key) => {
  WALLET_BRAND_NAME_KEY[WALLET_BRAND_CONTENT[key].name] = key;
});

export const useDisplayBrandName = (
  brandName: string = WALLET_BRAND_TYPES.WALLETCONNECT,
  address?: string
) => {
  const [realBrandName, setRealBrandName] = React.useState(brandName);
  const wallet = useWallet();
  const displayBrandName: string =
    WALLET_BRAND_CONTENT[realBrandName]?.name ||
    WALLET_BRAND_CONTENT[WALLET_BRAND_NAME_KEY[realBrandName]]?.name ||
    realBrandName;

  React.useEffect(() => {
    if (brandName !== WALLET_BRAND_TYPES.WALLETCONNECT) {
      setRealBrandName(brandName);
      return;
    }
    if (address) {
      wallet.getCommonWalletConnectInfo(address).then((result) => {
        if (!result) return;
        setRealBrandName(result.realBrandName || result.brandName);
      });
    }
  }, [address, brandName]);

  return [displayBrandName, realBrandName];
};
