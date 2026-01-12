import { CHAINS_ENUM } from '@debank/common';

export const TX_GAS_LIMIT_CHAIN_MAPPING = {
  //https://eips.ethereum.org/EIPS/eip-7825#why-16777216-224
  [CHAINS_ENUM.ETH]: 16_777_216,
  //https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/dual-block-architecture
  ['HYPER' as CHAINS_ENUM]: 30_000_000,
  //https://docs.monad.xyz/developer-essentials/gas-pricing#:~:text=Transaction%20gas%20limit
  ['MONAD' as CHAINS_ENUM]: 30_000_000,
  //https://docs.base.org/base-chain/network-information/block-building#per-transaction-gas-maximum
  [CHAINS_ENUM.BASE]: 16_777_216,
  //https://docs.linea.build/release-notes#block-size-changes
  [CHAINS_ENUM.LINEA]: 24_000_000,
};
