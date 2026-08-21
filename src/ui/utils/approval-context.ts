import { createContext } from 'react';
import type { Approval } from 'background/service/notification';

export type ApprovalBinding = {
  id: Approval['id'];
  component: Approval['data']['approvalComponent'];
};

export const ApprovalBindingContext = createContext<ApprovalBinding | null>(
  null
);

export const getApprovalBinding = (
  approval: Approval | null,
  binding: ApprovalBinding | null
): ApprovalBinding | null => {
  if (!approval) {
    return null;
  }

  const currentBinding = binding || {
    id: approval.id,
    component: approval.data.approvalComponent,
  };

  if (
    approval.id !== currentBinding.id ||
    approval.data.approvalComponent !== currentBinding.component
  ) {
    return null;
  }

  return currentBinding;
};

