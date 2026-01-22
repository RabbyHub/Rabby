import { Account } from '@/background/service/preference';

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
  } | null;
  account?: Account;
  origin?: string;
  requestedApproval?: boolean;
  isFromDesktopDapp?: boolean;
};
