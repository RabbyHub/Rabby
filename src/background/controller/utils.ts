import { Chain } from '@/types/chain';
import { findChain } from '@/utils/chain';
import { ethers } from 'ethers';
import { t } from 'i18next';
import _abiCoder, { AbiCoder } from 'web3-eth-abi';
import {
  permissionService,
  preferenceService,
  sessionService,
} from '../service';
import { Account } from '../service/preference';
import buildinProvider from '../utils/buildinProvider';
import eventBus from '@/eventBus';

export const web3AbiCoder = (_abiCoder as unknown) as AbiCoder;

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

  const chainId = findChain({
    serverId: chainServerId,
  })?.id.toString();

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

export const broadcastChainChanged = ({
  origin,
  chain,
}: {
  origin: string;
  chain: Chain;
}) => {
  if (permissionService.getConnectedSite(origin)?.isConnected) {
    // rabby:chainChanged event must be sent before chainChanged event
    sessionService.broadcastEvent(
      'rabby:chainChanged',
      {
        ...chain,
      },
      origin
    );
    sessionService.broadcastEvent(
      'chainChanged',
      {
        chain: chain.hex,
        networkVersion: chain.network,
      },
      origin
    );
    eventBus.emit('rabby:chainChanged', {
      chain,
      origin,
    });
  }
};
