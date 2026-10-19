import { CHAINS_ENUM } from '@debank/common';

export const TX_GAS_LIMIT_CHAIN_MAPPING = {
  /**
   * https://eips.ethereum.org/EIPS/eip-7825
   */
  //https://eips.ethereum.org/EIPS/eip-7825#why-16777216-224
  [CHAINS_ENUM.ETH]: 16_777_216,
  //https://docs.base.org/base-chain/network-information/block-building#per-transaction-gas-maximum
  [CHAINS_ENUM.BASE]: 16_777_216,
  //https://docs.bnbchain.org/announce/mendel-bsc/
  [CHAINS_ENUM.BSC]: 16_777_216,
  //https://docs.monad.xyz/developer-essentials/gas-pricing#:~:text=Transaction%20gas%20limit
  ['MONAD' as CHAINS_ENUM]: 30_000_000,
  //https://docs.linea.build/release-notes#block-size-changes
  [CHAINS_ENUM.LINEA]: 24_000_000,
  //https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/dual-block-architecture
  // fast block gas limit
  ['HYPER' as CHAINS_ENUM]: 3_000_000,
  // https://docs.tempo.xyz/protocol/tips/tip-1010
  ['TEMPO' as CHAINS_ENUM]: 30_000_000,
};

/**
 * https://eips.ethereum.org/EIPS/eip-8037
 * After EIP-8037 the EIP-7825 cap only bounds execution gas; state gas is paid
 * from the part of tx.gas above it, so tx.gas itself may reach 2^32 - 1.
 * Fill in a chain's activation timestamp (seconds) once its fork is scheduled.
 */
export const EIP8037_ACTIVATION_TIME: Partial<Record<CHAINS_ENUM, number>> = {};

const EIP8037_TX_MAX_TOTAL_GAS_LIMIT = 2 ** 32 - 1;

export const getTxGasLimit = (
  chainEnum: CHAINS_ENUM,
  timestamp: number
): number | undefined => {
  const activationTime = EIP8037_ACTIVATION_TIME[chainEnum];
  return activationTime !== undefined && timestamp >= activationTime
    ? EIP8037_TX_MAX_TOTAL_GAS_LIMIT
    : TX_GAS_LIMIT_CHAIN_MAPPING[chainEnum];
};
