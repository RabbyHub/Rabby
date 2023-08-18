import { CHAINS } from '@debank/common';
import { ethers } from 'ethers';
import { preferenceService } from '../service';
import buildinProvider from '../utils/buildinProvider';
import { Account } from '../service/preference';
import { t } from 'i18next';

export const getWeb3Provider = async ({
  chainServerId,
  account,
}: {
  chainServerId: string;
  account?: Account | null;
}) => {
  if (!account) {
    account = await preferenceService.getCurrentAccount();
  }
  if (!account) throw new Error(t('background.error.noCurrentAccount'));

  const chainId = Object.values(CHAINS)
    .find((chain) => chain.serverId === chainServerId)
    ?.id.toString();
  if (!chainId) throw new Error(t('background.error.invalidChainId'));

  buildinProvider.currentProvider.currentAccount = account.address;
  buildinProvider.currentProvider.currentAccountType = account.type;
  buildinProvider.currentProvider.currentAccountBrand = account.brandName;
  buildinProvider.currentProvider.chainId = chainId;

  const provider = new ethers.providers.Web3Provider(
    buildinProvider.currentProvider
  );

  return provider;
};
