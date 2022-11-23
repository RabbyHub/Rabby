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
  origin?: string;
  requestedApproval?: boolean;
};
