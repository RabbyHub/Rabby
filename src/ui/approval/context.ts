import { createContext, useContext } from 'react';
import type { Approval } from 'background/service/notification';
import { toApprovalRef, ApprovalRef } from '@/utils/signingTypes';

export type ApprovalScope = Readonly<{
  approval: ApprovalRef<Approval['data']['approvalComponent']>;
  signingTxId?: Approval['signingTxId'];
  approvalType?: Approval['data']['approvalType'];
  account: Approval['data']['account'];
  params?: Approval['data']['params'];
}>;

export const ApprovalScopeContext = createContext<ApprovalScope | null>(null);

export const createApprovalScope = (approval: Approval): ApprovalScope => {
  return {
    approval: toApprovalRef(approval.id, approval.data.approvalComponent),
    signingTxId: approval.signingTxId,
    approvalType: approval.data.approvalType,
    account: approval.data.account,
    params: approval.data.params,
  };
};

export const useApprovalScope = (): ApprovalScope => {
  const scope = useContext(ApprovalScopeContext);
  if (!scope) {
    throw new Error('useApprovalScope must be used within an approval subtree');
  }
  return scope;
};
