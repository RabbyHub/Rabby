import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Chain } from '@debank/common';
import BigNumber from 'bignumber.js';
import { CUSTOM_RPC_AUTO_DISCOVER_TOKENS } from '@/constant';
import { findChain, makeTokenFromChain } from '@/utils/chain';
import { WalletControllerType } from '../WalletContext';

const ERC20_BALANCE_OF_SELECTOR = '0x70a08231';

const encodeBalanceOf = (address: string) =>
  ERC20_BALANCE_OF_SELECTOR +
  address.toLowerCase().replace(/^0x/, '').padStart(64, '0');

const hexToAmount = (hex: string | undefined, decimals: number) => {
  if (!hex || hex === '0x') return 0;
  try {
    return new BigNumber(BigInt(hex).toString())
      .div(new BigNumber(10).pow(decimals))
      .toNumber();
  } catch (e) {
    return 0;
  }
};

/**
 * Best-effort hybrid metadata/price lookup. Returns backend token metadata
 * (symbol, decimals, logo, price) when reachable, otherwise null so the caller
 * can fall back to purely on-chain data and remain fully offline.
 */
const fetchTokenMeta = async (
  address: string,
  chainServerId: string,
  tokenId: string,
  wallet: WalletControllerType
): Promise<TokenItem | null> => {
  try {
    const meta = await wallet.openapi.getToken(address, chainServerId, tokenId);
    return meta || null;
  } catch (e) {
    return null;
  }
};

/**
 * Reads the native token balance plus a curated set of ERC-20 balances for a
 * chain directly from its (custom) RPC, entirely on-device. Amounts always come
 * from the RPC; prices/metadata come from the backend when available (hybrid).
 */
export const queryCustomRPCChainTokens = async (
  address: string,
  chainServerId: string,
  wallet: WalletControllerType
): Promise<TokenItem[]> => {
  const chain = findChain({ serverId: chainServerId });
  if (!chain) return [];

  const results: TokenItem[] = [];

  const nativeTask = (async () => {
    try {
      const nativeHex = await wallet.requestETHRpc<string>(
        { method: 'eth_getBalance', params: [address, 'latest'] },
        chainServerId
      );
      const decimals = chain.nativeTokenDecimals || 18;
      const meta = await fetchTokenMeta(
        address,
        chainServerId,
        chain.nativeTokenAddress,
        wallet
      );
      const token: TokenItem = meta || makeTokenFromChain(chain as Chain);
      token.amount = hexToAmount(nativeHex, meta?.decimals ?? decimals);
      token.raw_amount_hex_str = nativeHex;
      results.push(token);
    } catch (e) {
      // Native balance read failed (RPC unreachable) - skip.
    }
  })();

  const tokenAddresses = CUSTOM_RPC_AUTO_DISCOVER_TOKENS[chainServerId] || [];
  const erc20Tasks = tokenAddresses.map(async (tokenAddress) => {
    try {
      const balanceHex = await wallet.requestETHRpc<string>(
        {
          method: 'eth_call',
          params: [
            { to: tokenAddress, data: encodeBalanceOf(address) },
            'latest',
          ],
        },
        chainServerId
      );
      const meta = await fetchTokenMeta(
        address,
        chainServerId,
        tokenAddress,
        wallet
      );
      const decimals = meta?.decimals ?? 18;
      const token: TokenItem =
        meta ||
        ({
          id: tokenAddress,
          chain: chainServerId,
          decimals,
          symbol: '',
          display_symbol: null,
          optimized_symbol: '',
          logo_url: '',
          is_core: true,
          is_verified: true,
          is_wallet: true,
          is_suspicious: false,
          name: '',
          price: 0,
          amount: 0,
          time_at: 0,
        } as TokenItem);
      token.amount = hexToAmount(balanceHex, meta?.decimals ?? decimals);
      token.raw_amount_hex_str = balanceHex;
      results.push(token);
    } catch (e) {
      // Token balance read failed - skip this token.
    }
  });

  await Promise.all([nativeTask, ...erc20Tasks]);

  return results;
};

/**
 * Returns the set of chain serverIds that currently have an enabled custom RPC.
 * These chains should be read on-device rather than from the cloud backend.
 */
export const getCustomRPCEnabledServerIds = async (
  wallet: WalletControllerType
): Promise<Set<string>> => {
  const result = new Set<string>();
  try {
    const rpcMap = await wallet.getAllCustomRPC();
    Object.entries(rpcMap || {}).forEach(([chainEnum, item]) => {
      if (item?.enable) {
        const chain = findChain({ enum: chainEnum });
        if (chain) result.add(chain.serverId);
      }
    });
  } catch (e) {
    // ignore
  }
  return result;
};
