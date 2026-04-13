import { CHAINS_ENUM } from '@/constant';
import { L2_DEPOSIT_ADDRESS_MAP } from '@/constant/gas-account';
import { isSameAddress } from '@/ui/utils';
import { findChain, findChainByServerID } from '@/utils/chain';
import { GasAccountBridgeQuote } from '@rabby-wallet/rabby-api/dist/types';

export const MIN_GAS_ACCOUNT_DEPOSIT_USD = 1;
export const MAX_GAS_ACCOUNT_DEPOSIT_USD = 500;

export const getGasAccountDirectDepositAddress = (chainServerId?: string) => {
  const chain = chainServerId ? findChain({ serverId: chainServerId }) : null;
  if (!chain) {
    return null;
  }

  return L2_DEPOSIT_ADDRESS_MAP[chain.enum as CHAINS_ENUM] || null;
};

export const getGasAccountDepositMode = (chainServerId?: string) => {
  return getGasAccountDirectDepositAddress(chainServerId) ? 'direct' : 'bridge';
};

export const isValidBridgeQuote = ({
  quote,
  accountAddress,
  chainServerId,
  gasAccountAddress,
}: {
  quote?: GasAccountBridgeQuote | null;
  accountAddress?: string;
  chainServerId?: string;
  gasAccountAddress?: string;
}) => {
  if (
    !quote ||
    !quote.bridge_id ||
    !quote.tx ||
    !quote.tx.from ||
    !quote.tx.to ||
    !gasAccountAddress
  ) {
    return false;
  }

  const chain = chainServerId ? findChainByServerID(chainServerId) : null;
  if (!chain || Number(quote.tx.chainId) !== Number(chain.id)) {
    return false;
  }

  if (!accountAddress || !isSameAddress(quote.tx.from, accountAddress)) {
    return false;
  }

  return Number(quote.to_token_amount || 0) > 0;
};

export const pollGasAccountBridgeStatus = async ({
  fetchStatus,
  interval = 3000,
  maxAttempts = 20,
}: {
  fetchStatus: () => Promise<{ status: 'pending' | 'success' | 'failed' }>;
  interval?: number;
  maxAttempts?: number;
}) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await fetchStatus();
    if (result.status !== 'pending') {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return {
    status: 'pending' as const,
  };
};
