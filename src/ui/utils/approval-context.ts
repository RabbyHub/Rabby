import { createContext } from 'react';
import type { Approval } from 'background/service/notification';

export type ApprovalBinding = {
  id: Approval['id'];
  component: Approval['data']['approvalComponent'];
};

// Identity of the approval an approval page was mounted for, provided by
// ApprovalUtilsProvider. `useApproval` binds every resolve/reject to it, so a
// page can never act on the queued approval that replaced it. Null on pages
// that are not approval pages (Unlock, ImportSuccess, ...); those must name
// their approval explicitly or the action is dropped.
export const ApprovalBindingContext = createContext<ApprovalBinding | null>(
  null
);

// The approval an action is bound to: the one the caller named, else the one
// its page was mounted for. The background refuses an action that cannot name
// its approval, so an action with no id, or one whose id or component no longer
// matches the live approval, is stale and must be dropped here too.
export const getApprovalTarget = (
  approval: Approval | null,
  binding: ApprovalBinding | null,
  approvalId?: string
) => {
  // An explicit id wins over the ambient binding: the caller read the live
  // approval, whereas the binding is only what its page was mounted for. A
  // flow that legitimately moves onto a newly created approval - the Perps
  // invite handing over to a signing request - has no other way to say so.
  if (approvalId) {
    return { id: approvalId, isStale: approvalId !== approval?.id };
  }

  return {
    id: binding?.id,
    isStale:
      !binding ||
      binding.id !== approval?.id ||
      binding.component !== approval?.data?.approvalComponent,
  };
};
