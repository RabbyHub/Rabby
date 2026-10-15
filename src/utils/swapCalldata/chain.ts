import { CHAINS } from '@debank/common';
import defaultSupportedChains from '../../constant/default-support-chains.json';
import { CalldataDecodeError } from './errors';

export const getNativeTokenAddress = (
  chainId: number,
  nativeTokenAddress?: string
) => {
  // Live quotes supply the current chain metadata. Recorded fixtures can fall
  // back to the repository chain list, including chains missing from the SDK.
  const native =
    nativeTokenAddress ??
    defaultSupportedChains.find(
      (chain) => chain.community_id === chainId && !chain.is_disabled
    )?.native_token.id ??
    Object.values(CHAINS).find((chain) => chain.id === chainId)
      ?.nativeTokenAddress;
  if (!native) {
    throw new CalldataDecodeError(
      'decode.chain',
      `Native token is not configured for chain ${chainId}`
    );
  }
  return native;
};
