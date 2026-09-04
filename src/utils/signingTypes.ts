import { v4 as uuidv4 } from 'uuid';

export type Branded<T, Brand extends string> = T & {
  readonly __brand: Brand;
};

export type ApprovalId = Branded<string, 'ApprovalId'>;
export type SigningFlowId = Branded<string, 'SigningFlowId'>;
export type SigningAttemptId = Branded<string, 'SigningAttemptId'>;
export type InternalSignRequestId = Branded<string, 'InternalSignRequestId'>;
export type HardwareOperationId = Branded<string, 'HardwareOperationId'>;

export type ApprovalRef<Component extends string = string> = Readonly<{
  approvalId: ApprovalId;
  component: Component;
}>;

export type SigningFlowRef = Readonly<{
  flowId: SigningFlowId;
}>;

export type SigningAttemptRef = Readonly<{
  flowId: SigningFlowId;
  attemptId: SigningAttemptId;
}>;

export type AccountRef = Readonly<{
  address: string;
  type: string;
  brandName: string;
}>;

export type SigningRequestContext = Readonly<{
  flow: SigningFlowRef;
  attempt: SigningAttemptRef;
  account: AccountRef;
  origin: string;
  rpcRequestId: string;
  parentFlow?: SigningFlowRef;
}>;

export type ApprovalSigningContext = Readonly<{
  approval: ApprovalRef;
  signing?: Readonly<{
    flow: SigningFlowRef;
    attempt?: SigningAttemptRef;
  }>;
}>;

export type HardwareOperationRef =
  | Readonly<{
      kind: 'signing-attempt';
      attempt: SigningAttemptRef;
    }>
  | Readonly<{
      kind: 'standalone';
      operationId: HardwareOperationId;
    }>;

export type SigningAttemptFinishedEvent = Readonly<{
  attempt: SigningAttemptRef;
  success: boolean;
  data?: unknown;
  error?: string;
}>;

export const asApprovalId = (value: string): ApprovalId => value as ApprovalId;
export const asSigningFlowId = (value: string): SigningFlowId =>
  value as SigningFlowId;
export const asSigningAttemptId = (value: string): SigningAttemptId =>
  value as SigningAttemptId;
export const asInternalSignRequestId = (value: string): InternalSignRequestId =>
  value as InternalSignRequestId;
export const asHardwareOperationId = (value: string): HardwareOperationId =>
  value as HardwareOperationId;

export const createStandaloneHardwareOperation = (): HardwareOperationRef => ({
  kind: 'standalone',
  operationId: asHardwareOperationId(uuidv4()),
});

export const toApprovalRef = <Component extends string>(
  approvalId: string,
  component: Component
): ApprovalRef<Component> => ({
  approvalId: asApprovalId(approvalId),
  component,
});

export const toSigningFlowRef = (flowId: string): SigningFlowRef => ({
  flowId: asSigningFlowId(flowId),
});

export const toSigningAttemptRef = (
  flowId: string,
  attemptId: string
): SigningAttemptRef => ({
  flowId: asSigningFlowId(flowId),
  attemptId: asSigningAttemptId(attemptId),
});

export const requireSigningAttempt = (
  attempt?: SigningAttemptRef | null
): SigningAttemptRef => {
  if (!attempt) throw new Error('Signing approval is missing an attempt');
  return attempt;
};

export const toAccountRef = (
  account?: Partial<AccountRef> | null
): AccountRef | undefined => {
  if (!account?.address || !account.type || !account.brandName) return;
  return {
    address: account.address.toLowerCase(),
    type: account.type,
    brandName: account.brandName,
  };
};

export const sameAccountRef = (
  left?: Partial<AccountRef> | null,
  right?: Partial<AccountRef> | null
) => {
  const a = toAccountRef(left);
  const b = toAccountRef(right);
  return (
    !!a &&
    !!b &&
    a.address === b.address &&
    a.type === b.type &&
    a.brandName === b.brandName
  );
};
