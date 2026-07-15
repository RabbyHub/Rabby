import {
  AddrDescResponse,
  ContractInfo,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';
import { Chain } from 'background/service/openapi';
import type { Account } from '@/background/service/preference';
import { SignMessageHighlightToken } from './signMessageHighlighter';

type SignMessageProtocol = {
  id: string;
  name: string;
  logo_url: string;
};

export type SignMessageAddressTagKind =
  | 'malicious'
  | 'alias'
  | 'token'
  | 'protocol';

export const getSignMessageAddressTagKinds = ({
  isMalicious,
  alias,
  isToken,
  hasProtocol,
}: {
  isMalicious: boolean;
  alias?: string;
  isToken: boolean;
  hasProtocol: boolean;
}): SignMessageAddressTagKind[] => {
  if (isMalicious) return alias ? ['malicious', 'alias'] : ['malicious'];
  if (alias) return ['alias'];
  if (isToken) return ['token'];
  if (hasProtocol) return ['protocol'];
  return [];
};

export interface SignMessageAddressData {
  address: string;
  addressDesc: AddrDescResponse['desc'] | null;
  contractInfo: ContractInfo | null;
  alias?: string;
  isContract: boolean;
  isMalicious: boolean;
  kinds: SignMessageAddressTagKind[];
  protocol: SignMessageProtocol | null;
  token: TokenItem | null;
  hasInteraction: boolean;
  hasTransfer: boolean;
  onTransferWhitelist: boolean;
  hasReceiverPrivateKeyInWallet: boolean;
  hasReceiverMnemonicInWallet: boolean;
  localAccount: Account | null;
}

export type SignMessageAddressDataMap = Record<string, SignMessageAddressData>;

export interface SignMessageAddressDataProvider {
  getAlias(address: string): Promise<string | undefined>;
  getWhitelist(): Promise<string[]>;
  getAccountsByPriority(): Promise<Account[]>;
  getAddressSource(
    address: string
  ): Promise<'private-key' | 'seed-phrase' | null>;
  getAddressDesc(address: string): Promise<AddrDescResponse['desc'] | null>;
  getContractInfo(
    address: string,
    chainServerId: string
  ): Promise<ContractInfo | null>;
  hasInteraction(
    accountAddress: string,
    chainServerId: string,
    address: string
  ): Promise<boolean>;
  hasTransfer(
    chainServerId: string,
    accountAddress: string,
    address: string
  ): Promise<boolean>;
  getToken(
    accountAddress: string,
    chainServerId: string,
    address: string
  ): Promise<TokenItem | null>;
}

const getSignMessageAddresses = (tokens: SignMessageHighlightToken[]) => {
  const addresses = new Map<string, string>();
  tokens.forEach((token) => {
    if (token.type !== 'address') return;
    const address = token.address || token.value;
    addresses.set(address.toLowerCase(), address);
  });
  return addresses;
};

export const getSignMessageAddressDataRequestKey = (
  tokens: SignMessageHighlightToken[],
  chainServerId?: string,
  accountAddress?: string
) => {
  const addresses = Array.from(getSignMessageAddresses(tokens).keys()).sort();
  return addresses.length
    ? `${chainServerId || ''}:${
        accountAddress?.toLowerCase() || ''
      }:${addresses.join(',')}`
    : null;
};

export const isSignMessageAddressMalicious = ({
  addressDesc,
  contractInfo,
  isContract,
}: Pick<
  SignMessageAddressData,
  'addressDesc' | 'contractInfo' | 'isContract'
>) =>
  isContract
    ? !!contractInfo?.is_phishing
    : !!(addressDesc?.is_danger || addressDesc?.is_scam);

export const resolveSignMessageAddressData = async ({
  tokens,
  chain,
  accountAddress,
  provider,
}: {
  tokens: SignMessageHighlightToken[];
  chain: Chain;
  accountAddress: string;
  provider: SignMessageAddressDataProvider;
}): Promise<SignMessageAddressDataMap> => {
  const addresses = getSignMessageAddresses(tokens);
  if (!addresses.size) return {};

  const whitelistRequest = provider.getWhitelist().catch(() => [] as string[]);
  const accountsRequest = provider
    .getAccountsByPriority()
    .catch(() => [] as Account[]);

  const entries = await Promise.all(
    Array.from(addresses, async ([key, address]) => {
      const [
        alias,
        addressDesc,
        contractInfo,
        accounts,
        addressSource,
        whitelist,
      ] = await Promise.all([
        provider.getAlias(address).catch(() => undefined),
        provider.getAddressDesc(address).catch(() => null),
        provider.getContractInfo(address, chain.serverId).catch(() => null),
        accountsRequest,
        provider.getAddressSource(address).catch(() => null),
        whitelistRequest,
      ]);
      const localAccount =
        accounts.find((account) => account.address.toLowerCase() === key) ||
        null;
      const isContract = !!(
        contractInfo || addressDesc?.contract?.[chain.serverId]
      );
      const [relationship, token] = await Promise.all([
        isContract
          ? provider
              .hasInteraction(accountAddress, chain.serverId, address)
              .catch(() => false)
          : provider
              .hasTransfer(chain.serverId, accountAddress, address)
              .catch(() => false),
        contractInfo?.is_token
          ? provider
              .getToken(accountAddress, chain.serverId, address)
              .catch(() => null)
          : Promise.resolve(null),
      ]);
      const protocol =
        contractInfo?.protocol ||
        addressDesc?.protocol?.[chain.serverId] ||
        null;
      const isMalicious = isSignMessageAddressMalicious({
        addressDesc,
        contractInfo,
        isContract,
      });

      return [
        key,
        {
          address,
          addressDesc,
          contractInfo,
          alias,
          isContract,
          isMalicious,
          kinds: getSignMessageAddressTagKinds({
            isMalicious,
            alias,
            isToken: !!token,
            hasProtocol: !!protocol,
          }),
          protocol,
          token,
          hasInteraction: isContract ? relationship : false,
          hasTransfer: isContract ? false : relationship,
          onTransferWhitelist: whitelist.some(
            (item) => item.toLowerCase() === key
          ),
          hasReceiverPrivateKeyInWallet: addressSource === 'private-key',
          hasReceiverMnemonicInWallet: addressSource === 'seed-phrase',
          localAccount,
        },
      ] as const;
    })
  );

  return Object.fromEntries(entries);
};
