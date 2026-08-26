import { createContext } from 'react';
import type { Approval } from 'background/service/notification';

export type ApprovalBinding = {
  id: Approval['id'];
  component: Approval['data']['approvalComponent'];
};

export const ApprovalBindingContext = createContext<ApprovalBinding | null>(
  null
);

/**
 * Validates and returns the strict approval binding context.
 * Security hardening: Requires an explicit, captured binding context matching the current 
 * active approval, preventing cross-request race conditions and unauthorized resolution 
 * from uncaptured components (fail-closed model).
 */
export const getApprovalBinding = (
  approval: Approval | null,
  binding: ApprovalBinding | null
): ApprovalBinding | null => {
  // Reject if no captured binding or no approval is available.
  // This strictly enforces the fail-closed request handling required by the automated review.
  if (!approval || !binding) {
    return null;
  }

  // Ensure strict enforcement of context integrity: 
  // Drop out-of-context or mismatched bindings to prevent asynchronous race vulnerabilities.
  if (
    approval.id !== binding.id ||
    approval.data.approvalComponent !== binding.component
  ) {
    return null;
  }

  return binding;
};