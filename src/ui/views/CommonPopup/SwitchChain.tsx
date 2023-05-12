import { WALLET_BRAND_TYPES } from '@/constant';
import { useCommonPopupView } from '@/ui/utils';
import React from 'react';

export const SwitchChain: React.FC = () => {
  const { setTitle, account, setHeight } = useCommonPopupView();

  React.useEffect(() => {
    setTitle('How to switch');
    setHeight(420);
  }, []);

  const url = React.useMemo(() => {
    switch (account?.brandName) {
      case WALLET_BRAND_TYPES.METAMASK:
        return '/images/wallet/switch-chain-metamask.png';
      case WALLET_BRAND_TYPES.TP:
        return '/images/wallet/switch-chain-tp.png';
      case WALLET_BRAND_TYPES.IMTOKEN:
        return '/images/wallet/switch-chain-imtoken.png';
      case WALLET_BRAND_TYPES.TRUSTWALLET:
        return '/images/wallet/switch-chain-trustwallet.png';
      default:
        return '/images/wallet/switch-chain-common.png';
    }
  }, [account?.brandName]);
  return (
    <div className="p-[10px]">
      <img src={url} className="w-full" />
    </div>
  );
};
