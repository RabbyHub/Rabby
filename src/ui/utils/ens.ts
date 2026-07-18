import {
  createPublicClient,
  custom,
  defineChain,
  getAddress,
  keccak256,
  stringToHex,
  zeroAddress,
} from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { findChainByID } from '@/utils/chain';
import type { WalletControllerType } from '@/ui/utils';

const XDC_CHAIN_ID = 50;
const XDCID_REGISTRY_ADDRESS =
  '0x05fa64a05bc205DeDF47e023d2D90c2d119cd097';
const XDCID_RESOLVER_ADDRESS =
  '0x52bfa70B30190050F77033Fe427De8B3d4A8F453';

const xdcMainnet = defineChain({
  id: XDC_CHAIN_ID,
  name: 'XDC Network',
  nativeCurrency: {
    name: 'XDC',
    symbol: 'XDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.xdcrpc.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'XDCScan',
      url: 'https://xdcscan.com',
    },
  },
});

const xdcidRegistryAbi = [
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: 'owner', type: 'address' }],
  },
] as const;

const xdcidResolverAbi = [
  {
    type: 'function',
    name: 'addresses',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: 'addr', type: 'address' }],
  },
] as const;

export type ResolvedAddressName = {
  addr: string;
  name: string;
  protocol: 'ENS' | 'XDCID';
};

export const normalizeXdcidName = (name: string): string | null => {
  const canonicalName = name.trim().toLowerCase();
  if (!canonicalName.endsWith('.xdc')) return null;

  const label = canonicalName.slice(0, -4);
  if (label.length < 3 || label.length > 63) return null;
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(label)) return null;

  return label + '.xdc';
};

const resolveXdcidAddressByName = async (
  input: string,
  wallet: WalletControllerType
): Promise<ResolvedAddressName | null> => {
  const canonicalName = normalizeXdcidName(input);
  if (!canonicalName) return null;

  const xdcServerId = findChainByID(XDC_CHAIN_ID)?.serverId || 'xdc';
  const xdcClient = createPublicClient({
    chain: xdcMainnet,
    transport: custom({
      request: async ({ method, params }) =>
        wallet.requestETHRpc(
          {
            method,
            params: (params || []) as any[],
          },
          xdcServerId
        ),
    }),
  });

  try {
    const node = keccak256(stringToHex(canonicalName));
    const [owner, resolvedAddress] = await Promise.all([
      xdcClient.readContract({
        address: XDCID_REGISTRY_ADDRESS,
        abi: xdcidRegistryAbi,
        functionName: 'ownerOf',
        args: [node],
      }),
      xdcClient.readContract({
        address: XDCID_RESOLVER_ADDRESS,
        abi: xdcidResolverAbi,
        functionName: 'addresses',
        args: [node],
      }),
    ]);

    if (owner === zeroAddress || resolvedAddress === zeroAddress) return null;

    return {
      addr: getAddress(resolvedAddress),
      name: canonicalName,
      protocol: 'XDCID',
    };
  } catch {
    return null;
  }
};

const resolveEnsAddressByName = async (
  input: string,
  wallet: WalletControllerType
): Promise<ResolvedAddressName | null> => {
  const ethServerId = findChainByID(1)?.serverId || 'eth';
  const ensClient = createPublicClient({
    chain: mainnet,
    transport: custom({
      request: async ({ method, params }) =>
        wallet.requestETHRpc(
          {
            method,
            params: (params || []) as any[],
          },
          ethServerId
        ),
    }),
  });

  try {
    const normalizedName = normalize(input);
    const addr = await ensClient.getEnsAddress({
      name: normalizedName,
    });
    if (!addr) return null;
    return {
      addr,
      name: normalizedName,
      protocol: 'ENS',
    };
  } catch {
    return null;
  }
};

export const resolveAddressByName = async (
  name: string,
  wallet: WalletControllerType
): Promise<ResolvedAddressName | null> => {
  const input = name?.trim();
  if (!input) return null;

  if (input.toLowerCase().endsWith('.xdc')) {
    return resolveXdcidAddressByName(input, wallet);
  }

  return resolveEnsAddressByName(input, wallet);
};
