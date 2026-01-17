import { Account } from '@/background/service/preference';

type InternalMethods = keyof typeof import('./internalMethod')['default'];

/**
 * EIP-7702 Authorization Request
 * Used by dApps to request code delegation signatures
 */
export interface Eip7702AuthorizationRequest {
  /** EOA address that will sign the authorization */
  from: string;
  /** Smart contract address to delegate code execution to */
  contractAddress: string;
  /** Chain ID (0 = all chains, undefined = current chain) */
  chainId?: number;
  /** Authorization nonce (undefined = auto-fetch from chain) */
  nonce?: number | string;
}

/**
 * Signed EIP-7702 Authorization Response
 * Returned to dApps after user approval
 */
export interface SignedEip7702Authorization {
  chainId: `0x${string}`;
  address: string;
  nonce: `0x${string}`;
  yParity: `0x${string}`;
  r: `0x${string}`;
  s: `0x${string}`;
}

export type ProviderRequest<
  TMethod extends InternalMethods | string = string
> = {
  data: {
    method: TMethod;
    params?: any;
    $ctx?: any;
  };
  session?: {
    name: string;
    origin: string;
    icon: string;
  } | null;
  account?: Account;
  origin?: string;
  requestedApproval?: boolean;
  isFromDesktopDapp?: boolean;
};
