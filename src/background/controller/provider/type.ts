import { Account } from '@/background/service/preference';
import type { ApprovalRef } from '@/background/service/notification';

type InternalMethods = keyof typeof import('./internalMethod')['default'];

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
    isFromRabby?: boolean;
  } | null;
  account?: Account;
  // In-process callback supplied by the wallet controller, just for perps invite, never by a dapp.
  onApproval?: (approval: ApprovalRef) => void;
  origin?: string;
  requestedApproval?: boolean;
  sourceFrameId?: number;
};
