import { Account } from '@/background/service/preference';
import type {
  ApprovalRef,
  InternalSignRequestId,
  SigningRequestContext,
} from '@/utils/signingTypes';

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
  origin?: string;
  requestedApproval?: boolean;
  sourceFrameId?: number;
  approval?: ApprovalRef;
  internalSignRequestId?: InternalSignRequestId;
  signing?: SigningRequestContext;
};
