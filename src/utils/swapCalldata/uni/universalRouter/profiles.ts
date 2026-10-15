import { CalldataDecodeError } from '../../errors';
import { deployments, UniversalRouterVersion } from './deployments';

export interface RouterProfile {
  version: UniversalRouterVersion;
  commandMask: number;
  v4Version: '2.0' | '2.1.0' | '2.1' | null;
  supportsSigned: boolean;
}

const profiles: Record<
  UniversalRouterVersion,
  Omit<RouterProfile, 'version'>
> = {
  // The official v1.1.0 tag still references the original V1 deployments.
  '1.0/1.1': { commandMask: 0x1f, v4Version: null, supportsSigned: false },
  '1.2': { commandMask: 0x3f, v4Version: null, supportsSigned: false },
  '2.0': { commandMask: 0x3f, v4Version: '2.0', supportsSigned: false },
  '2.1.0': { commandMask: 0x7f, v4Version: '2.1.0', supportsSigned: true },
  '2.1.1': { commandMask: 0x7f, v4Version: '2.1', supportsSigned: true },
  '2.1.2': { commandMask: 0x7f, v4Version: '2.1', supportsSigned: true },
  '2.2.0': { commandMask: 0x7f, v4Version: '2.1', supportsSigned: true },
};

export const getRouterProfile = (
  chainId: number,
  router: string
): RouterProfile => {
  const deployment = deployments[chainId]?.[router.toLowerCase()];
  if (!deployment) {
    throw new CalldataDecodeError(
      'decode.uni.routerVersion',
      `Unknown Universal Router version for chain ${chainId}, router ${router}`
    );
  }
  const version =
    typeof deployment === 'string' ? deployment : deployment.version;
  const profile = { version, ...profiles[version] };
  if (typeof deployment !== 'string') {
    profile.commandMask = deployment.commandMask;
  }
  return profile;
};
