import { EthereumProvider } from '@/background/utils/buildinProvider';
import { ethers } from 'ethers';

const providers: { [network: string]: ethers.providers.Web3Provider } = {};

/**
 * Created a fallback rpc provider in which providers are prioritized from private to public and in case there are multiple public ones, from top to bottom.
 * @param chainId
 * @returns provider or fallbackprovider in case multiple rpcs are configured
 */
export const getProvider = (chainId: string): ethers.providers.Web3Provider => {
  if (!providers[chainId]) {
    const provider = new EthereumProvider();
    provider.chainId = chainId;
    const buildinProvider = {
      currentProvider: new Proxy(provider, {
        deleteProperty: () => true,
      }),
    };
    providers[chainId] = new ethers.providers.Web3Provider(
      buildinProvider.currentProvider
    );
  }
  return providers[chainId];
};
