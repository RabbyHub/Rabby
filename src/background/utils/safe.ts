import { ethers } from 'ethers';
import { preferenceService } from '../service';
import { EthereumProvider } from './buildinProvider';
import Safe from '@rabby-wallet/gnosis-sdk';

export const createSafeService = async ({
  address,
  networkId,
}: {
  address: string;
  networkId: string;
}) => {
  const account = await preferenceService.getCurrentAccount();
  const currentProvider = new EthereumProvider();
  if (account) {
    currentProvider.currentAccount = account.address;
    currentProvider.currentAccountType = account.type;
    currentProvider.currentAccountBrand = account.brandName;
  }
  currentProvider.chainId = networkId;

  const provider = new ethers.providers.Web3Provider(currentProvider) as any;

  const version = await Safe.getSafeVersion({
    address,
    provider,
  });

  const safe = new Safe(address, version, provider, networkId);
  return safe;
};
