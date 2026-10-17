import {
  UNIVERSAL_ROUTER_ADDRESS,
  UniversalRouterVersion,
} from '@uniswap/universal-router-sdk';
import { CalldataDecodeError } from '../../errors';
import { isSameAddress } from '../../utils';

export interface RouterProfile {
  version: UniversalRouterVersion;
  commandMask: number;
}

export const getRouterProfile = (
  chainId: number,
  router: string
): RouterProfile => {
  // Match the current backend's x-universal-router-version configuration.
  const requestedVersion =
    chainId === 4663 || chainId === 5042
      ? UniversalRouterVersion.V2_1_1
      : UniversalRouterVersion.V2_0;
  let expectedRouter: string | undefined;
  try {
    expectedRouter = UNIVERSAL_ROUTER_ADDRESS(requestedVersion, chainId);
  } catch {
    // Unsupported chains and addresses must not fall back to a guessed layout.
  }
  if (!expectedRouter || !isSameAddress(router, expectedRouter)) {
    throw new CalldataDecodeError(
      'decode.uni.routerVersion',
      `Unknown Universal Router version for chain ${chainId}, router ${router}; expected the current quote deployment (${requestedVersion})`
    );
  }

  // The SDK's zkSync 2.0 address aliases the deployed 1.2 Router. Its verified
  // Commands.sol uses a 5-bit mask and has no V4 swap command.
  if (chainId === 324) {
    return { version: UniversalRouterVersion.V1_2, commandMask: 0x1f };
  }
  return {
    version: requestedVersion,
    commandMask: requestedVersion === UniversalRouterVersion.V2_0 ? 0x3f : 0x7f,
  };
};
