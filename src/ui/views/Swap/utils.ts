import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { isSwapWrapToken as matchSwapWrapToken } from '@rabby-wallet/rabby-swap';
import { findChainByEnum } from '@/utils/chain';

export function getSwapNativeTokenAddress(chain: CHAINS_ENUM) {
  return (
    findChainByEnum(chain)?.nativeTokenAddress ||
    CHAINS[chain].nativeTokenAddress
  );
}

export function getSwapChainId(chain: CHAINS_ENUM) {
  return findChainByEnum(chain)?.id || CHAINS[chain].id;
}

export function isSwapWrapToken(
  payTokenId: string,
  receiveId: string,
  chain: CHAINS_ENUM
) {
  return matchSwapWrapToken(
    payTokenId,
    receiveId,
    chain,
    getSwapNativeTokenAddress(chain)
  );
}
