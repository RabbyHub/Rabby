import { createPublicClient, custom } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { findChainByID } from '@/utils/chain';
import type { WalletControllerType } from '@/ui/utils';

export const resolveEnsAddressByName = async (
  name: string,
  wallet: WalletControllerType
): Promise<{ addr: string; name: string } | null> => {
  const input = name?.trim();
  if (!input) return null;

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
    };
  } catch {
    return null;
  }
};
