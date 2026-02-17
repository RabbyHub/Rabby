import type { WalletControllerType } from '@/ui/utils/WalletContext';
import { ethers } from 'ethers';

const providers: {
  [cacheKey: string]: ethers.providers.Web3Provider;
} = {};

type Eip1193Provider = {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
};

export function getProviderByWallet(
  wallet: WalletControllerType,
  chainServerId: string,
  account?: {
    address: string;
    type: string;
    brandName: string;
  }
): ethers.providers.Web3Provider {
  const cacheKey = `${chainServerId}-${account?.address || 'no-account'}`;
  if (providers[cacheKey]) return providers[cacheKey];

  const eip1193Provider: Eip1193Provider = {
    request: ({ method, params }) => {
      return wallet.requestETHRpc(
        { method, params: params || [] },
        chainServerId,
        account
      );
    },
  };

  providers[cacheKey] = new ethers.providers.Web3Provider(
    eip1193Provider as any
  );
  return providers[cacheKey];
}
