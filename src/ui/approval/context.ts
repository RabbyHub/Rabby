import { createContext, useContext } from 'react';
import type { Approval } from 'background/service/notification';
import { toApprovalRef } from '@/utils/signingTypes';
import type {
  ApprovalRef,
  SigningAttemptRef,
  SigningFlowRef,
} from '@/utils/signingTypes';

export type ApprovalScope = Readonly<{
  approval: ApprovalRef<Approval['data']['approvalComponent']>;
  signing?: Readonly<{
    flow: SigningFlowRef;
    attempt?: SigningAttemptRef;
  }>;
  signingTxId?: Approval['signingTxId'];
  approvalType?: Approval['data']['approvalType'];
  account: Approval['data']['account'];
  params?: Approval['data']['params'];
  origin?: Approval['data']['origin'];
}>;

export const ApprovalScopeContext = createContext<ApprovalScope | null>(null);

export const createApprovalScope = (approval: Approval): ApprovalScope => {
  const flow = approval.data.signing?.flow;
  const attempt = approval.data.signing?.attempt;

  return {
    approval: toApprovalRef(approval.id, approval.data.approvalComponent),
    signing: flow ? { flow, attempt } : undefined,
    signingTxId: approval.signingTxId,
    approvalType: approval.data.approvalType,
    account: approval.data.account,
    params: approval.data.params,
    origin: approval.data.origin,
  };
};

export const useApprovalScope = (): ApprovalScope => {
  const scope = useContext(ApprovalScopeContext);
  if (!scope) {
    throw new Error('useApprovalScope must be used within an approval subtree');
  }
  return scope;
};
