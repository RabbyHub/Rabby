import { createContext } from 'react';
import type { Approval } from 'background/service/notification';

export type ApprovalBinding = {
  id: Approval['id'];
  component: Approval['data']['approvalComponent'];
};

// Identity of the approval an approval page was mounted for. `useApproval`
// binds every resolve/reject to it, so a page can never act on the queued
// approval that replaced it. Null outside the approval container (Unlock,
// ImportSuccess, CommonPopup, ...), where the old unbound behaviour stands.
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
  const id = approvalId ?? binding?.id;

  return {
    id,
    isStale:
      !id ||
      id !== approval?.id ||
      (!!binding &&
        (binding.id !== approval?.id ||
          binding.component !== approval?.data?.approvalComponent)),
  };
};
