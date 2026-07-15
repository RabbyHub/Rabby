import { useMemo } from 'react';
import { useAsync } from 'react-use';
import { Chain } from 'background/service/openapi';
import { KEYRING_TYPE } from 'consts';
import { useWallet } from '@/ui/utils';
import { sortAccountByPriority } from '@/utils/account';
import { SignMessageHighlightToken } from './signMessageHighlighter';
import {
  getSignMessageAddressDataRequestKey,
  resolveSignMessageAddressData,
  SignMessageAddressDataProvider,
  SignMessageAddressDataMap,
} from './signMessageAddressData';

const EMPTY_ADDRESS_DATA: SignMessageAddressDataMap = {};

export const useSignMessageAddressData = ({
  tokens,
  chain,
  accountAddress,
}: {
  tokens: SignMessageHighlightToken[];
  chain?: Chain;
  accountAddress: string;
}) => {
  const wallet = useWallet();
  const provider = useMemo<SignMessageAddressDataProvider>(
    () => ({
      getAlias: (address) => wallet.getAlianName(address),
      getWhitelist: () => wallet.getWhitelist(),
      getAccountsByPriority: async () =>
        (await wallet.getAllVisibleAccountsArray()).sort(sortAccountByPriority),
      getAddressSource: async (address) => {
        const keyringType = await wallet.hasPrivateKeyInWallet(address);
        if (keyringType === KEYRING_TYPE.SimpleKeyring) return 'private-key';
        if (keyringType === KEYRING_TYPE.HdKeyring) return 'seed-phrase';
        return null;
      },
      getAddressDesc: async (address) =>
        (await wallet.openapi.addrDesc(address)).desc,
      getContractInfo: (address, chainServerId) =>
        wallet.openapi.getContractInfo(address, chainServerId),
      hasInteraction: async (account, chainServerId, address) =>
        (await wallet.openapi.hasInteraction(account, chainServerId, address))
          .has_interaction,
      hasTransfer: async (chainServerId, account, address) =>
        (await wallet.openapi.hasTransfer(chainServerId, account, address))
          .has_transfer,
      getToken: (account, chainServerId, address) =>
        wallet.openapi.getToken(account, chainServerId, address),
    }),
    [wallet]
  );
  const requestKey = useMemo(
    () =>
      getSignMessageAddressDataRequestKey(
        tokens,
        chain?.serverId,
        accountAddress
      ),
    [accountAddress, chain?.serverId, tokens]
  );
  const { value: request } = useAsync(async () => {
    if (!chain || !requestKey) {
      return { key: requestKey, data: EMPTY_ADDRESS_DATA };
    }

    return {
      key: requestKey,
      data: await resolveSignMessageAddressData({
        tokens,
        chain,
        accountAddress,
        provider,
      }),
    };
  }, [provider, requestKey]);
  return request?.key === requestKey ? request.data : EMPTY_ADDRESS_DATA;
};
